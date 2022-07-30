import * as core from 'aws-cdk-lib';
import {Construct} from "constructs";
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as alb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as r53 from 'aws-cdk-lib/aws-route53';

export interface ApplicationStackProps extends core.StackProps {
    vpc: ec2.IVpc;
    cluster: ecs.ICluster;
    sslCertificate: acm.ICertificate;
    hostedZone: r53.IHostedZone;
}

export class ApplicationResourceStack extends core.Stack {

    constructor(scope: Construct, id: string, props: ApplicationStackProps) {
        super(scope, id, props);
        const {vpc, cluster, sslCertificate, hostedZone} = props;

        // Task Definition

        const apiTaskDefName = `fargate-bg-task`;
        const taskDefinition = new ecs.FargateTaskDefinition(this, apiTaskDefName, {
            family: apiTaskDefName,
            cpu: 256,
            memoryLimitMiB: 512,
        });

        const logGroup = new logs.LogGroup(this, `fargate-bg--logs`, {
            logGroupName: `fargate-bg-logs`,
            removalPolicy: core.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_MONTH
        });

        const ecrRepo = ecr.Repository.fromRepositoryName(this, 'ecr-repo', 'fargate-bg');

        taskDefinition.addContainer(`fargate-bg-container`, {
            containerName: `fargate-bg-container`,
            image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
            portMappings: [{containerPort: 8080}],
            logging: ecs.LogDriver.awsLogs({
                logGroup,
                streamPrefix: 'api'
            })
        });

        const taskExecutionPolicy = iam.ManagedPolicy.fromManagedPolicyArn(this, 'task-execution-policy', 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy')
        taskDefinition.executionRole?.addManagedPolicy(taskExecutionPolicy);

        // Service
        const serviceName = `fargate-bg-service`;
        const serviceSecurityGroup = new ec2.SecurityGroup(this, `${serviceName}-sg`, {
            vpc,
            securityGroupName: `${serviceName}-sg`,
        });
        serviceSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(8080));

        const service = new ecp.ApplicationMultipleTargetGroupsFargateService(this, 'fg-service', {
            cluster,
            taskDefinition,
            serviceName,
            loadBalancers: [
                {
                    domainName: `api.fgpoc.${hostedZone.zoneName}`,
                    domainZone: hostedZone,
                    name: 'fg-alb',
                    listeners: [
                        {
                            protocol: alb.ApplicationProtocol.HTTPS,
                            certificate: sslCertificate,
                            name: 'fg-alb-https'
                        }
                    ]
                }
            ],
            desiredCount: 1,
            targetGroups: [
                {
                    containerPort: 8080,
                    listener: 'fg-alb-https',
                    pathPattern: ''
                }
            ],
            cpu: 256,
            memoryLimitMiB: 512
        });

        service.targetGroup.configureHealthCheck({
            path: '/ping',
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5
        });
    }
}