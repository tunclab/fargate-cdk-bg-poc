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
        const {cluster, sslCertificate, hostedZone} = props;

        // Task Definition

        const apiTaskDefName = `fargate-bg-task`;
        const executionRole = new iam.Role(this, `fargate-bg-task-execution-role`, {
            roleName: 'fargate-bg-task-execution-role',
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromManagedPolicyArn(this, 'ex-role','arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly')
            ]
        });
        const taskDefinition = new ecs.FargateTaskDefinition(this, apiTaskDefName, {
            family: apiTaskDefName,
            cpu: 256,
            memoryLimitMiB: 512,
            executionRole
        });

        const logGroup = new logs.LogGroup(this, `fargate-bg-logs`, {
            logGroupName: `fargate-bg-logs`,
            removalPolicy: core.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_MONTH
        });

        const ecrRepo = ecr.Repository.fromRepositoryName(this, 'ecr-repo', 'fargate-bg');

        taskDefinition.addContainer(`fargate-bg-container`, {
            containerName: `fargate-bg-container`,
            image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'v0.0.1-beta.3'),
            portMappings: [{containerPort: 8080}],
            logging: ecs.LogDriver.awsLogs({
                logGroup,
                streamPrefix: 'api'
            })
        });

        // Service
        const serviceName = `fargate-bg-service`;

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