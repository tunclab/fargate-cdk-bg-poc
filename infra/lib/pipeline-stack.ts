import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cp from 'aws-cdk-lib/aws-codepipeline';
import * as cpa from 'aws-cdk-lib/aws-codepipeline-actions';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new cp.Pipeline(this, 'pipeline', {
      pipelineName: 'fargate-bg-pipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [

          ]
        },
        {
          stageName: 'Build',
          actions: []
        }
      ]
    });

  }
}
