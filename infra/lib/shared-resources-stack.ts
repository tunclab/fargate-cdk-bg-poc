import * as core from 'aws-cdk-lib';
import {Construct} from "constructs";
import * as r53 from "aws-cdk-lib/aws-route53";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface SharedResourcesStackProps extends core.StackProps {
    hostedZoneId: string;
    hostedZoneName: string;
    containerPort: number;
}

export class SharedResourcesStack extends core.Stack {

    public readonly hostedZone: r53.IHostedZone;
    public readonly vpc: ec2.Vpc;
    public readonly cluster: ecs.Cluster;
    public readonly certificate: acm.Certificate;

    constructor(scope: Construct, id: string, props: SharedResourcesStackProps) {
        super(scope, id, props);

        this.hostedZone = r53.HostedZone.fromHostedZoneAttributes(this, `hosted-zone`, {
            hostedZoneId: props.hostedZoneId,
            zoneName: props.hostedZoneName
        });

        this.certificate = new acm.Certificate(this, 'poc-acm-cert', {
            validation: acm.CertificateValidation.fromDns(this.hostedZone),
            domainName: `api.fgpoc.${props.hostedZoneName}`
        });

        this.vpc = new ec2.Vpc(this, 'poc-vpc', {
            maxAzs: 2,
            subnetConfiguration: [
                {subnetType: ec2.SubnetType.PUBLIC, name: 'DMZ'},
                {subnetType: ec2.SubnetType.PRIVATE_ISOLATED, name: 'Service'}
            ],
        });
        this.vpc.addInterfaceEndpoint('ecr-docker', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        });
        this.vpc.addInterfaceEndpoint('ecr-api', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
        });
        this.vpc.addInterfaceEndpoint('secret-manager', {
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        });
        this.vpc.addInterfaceEndpoint('s3', {
            service: ec2.InterfaceVpcEndpointAwsService.STORAGE_GATEWAY,
        });
        this.vpc.addInterfaceEndpoint('logs', {
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        });
        this.vpc.addGatewayEndpoint('s3-gw', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [
                { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
            ]
        });

        this.cluster = new ecs.Cluster(this, 'poc-cluster', {
            clusterName: 'poc-cluster',
            vpc: this.vpc,
        });

    }
}