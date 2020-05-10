import sys
from awacs.aws import PolicyDocument, Statement, Principal, Allow, Action
from troposphere.constants import NUMBER
from troposphere import FindInMap, GetAtt, Join, Output
from troposphere import Parameter, Ref, Template
from troposphere.awslambda import Function, Code, EventSourceMapping, MEMORY_VALUES
from troposphere.cloudformation import CustomResource
from troposphere.ec2 import SecurityGroup
from troposphere.iam import Role, Policy
from troposphere.s3 import Bucket, NotificationConfiguration, TopicConfigurations
from troposphere.sns import Topic, Subscription, TopicPolicy
from troposphere.sqs import Queue, RedrivePolicy, QueuePolicy


def generate(env='pilot'):
    template = Template()

    template.set_version("2010-09-09")

    # ExistingVPC = template.add_parameter(Parameter(
    #     "ExistingVPC",
    #     Type="AWS::EC2::VPC::Id",
    #     Description=(
    #         "The VPC ID that includes the security groups in the"
    #         "ExistingSecurityGroups parameter."
    #     ),
    # ))
    #
    # ExistingSecurityGroups = template.add_parameter(Parameter(
    #     "ExistingSecurityGroups",
    #     Type="List<AWS::EC2::SecurityGroup::Id>",
    # ))

    param_spider_lambda_memory_size = template.add_parameter(
        Parameter(
            'SpiderLambdaMemorySize',
            Type=NUMBER,
            Description='Amount of memory to allocate to the Lambda Function',
            Default='128',
            AllowedValues=MEMORY_VALUES
        )
    )

    param_spider_lambda_timeout = template.add_parameter(
        Parameter(
            'SpiderLambdaTimeout',
            Type=NUMBER,
            Description='Timeout in seconds for the Lambda function',
            Default='60'
        )
    )

    spider_tasks_queue_dlq_name = f'{env}-spider-tasks-dlq'
    spider_tasks_queue_dlq = template.add_resource(
        Queue(
            "SpiderTasksDLQ",
            QueueName=spider_tasks_queue_dlq_name,
            MessageRetentionPeriod=(60 * 60 * 24 * 14),
        )
    )

    spider_tasks_queue_name = f"{env}-spider-tasks"
    spider_tasks_queue = template.add_resource(
        Queue(
            "SpiderTasksQueue",
            QueueName=spider_tasks_queue_name,
            MessageRetentionPeriod=(60 * 60 * 24 * 14),
            VisibilityTimeout=300,
            RedrivePolicy=RedrivePolicy(
                deadLetterTargetArn=GetAtt(spider_tasks_queue_dlq, "Arn"),
                maxReceiveCount=2,
            ),
            DependsOn=[spider_tasks_queue_dlq],
        )
    )

    spider_lambda_role = template.add_resource(
        Role(
            "SpiderLambdaRole",
            Path="/",
            Policies=[
                Policy(
                    PolicyName="root",
                    PolicyDocument=PolicyDocument(
                        Version="2012-10-17",
                        Id="root",
                        Statement=[
                            Statement(
                                Effect=Allow,
                                Resource=["*"],
                                Action=[
                                    Action("logs", "*")
                                ]
                            ),
                            Statement(
                                Effect=Allow,
                                Resource=["*"],
                                Action=[
                                    Action("s3", "*")
                                ]
                            ),
                            Statement(
                                Effect=Allow,
                                Resource=["*"],
                                Action=[
                                    Action("sqs", "*")
                                ]
                            ),
                        ]
                    ),
                )
            ],
            AssumeRolePolicyDocument={
                "Version": "2012-10-17",
                "Statement": [{
                    "Action": ["sts:AssumeRole"],
                    "Effect": "Allow",
                    "Principal": {
                        "Service": ["lambda.amazonaws.com"]
                    }
                }]
            },
        )
    )

    spider_file_path = './spider/index.js'
    spider_code = open(spider_file_path, 'r').readlines()
    spider_lambda = template.add_resource(
        Function(
            "SpiderLambda",
            Code=Code(
                S3Bucket='spider-lambda',
                S3Key=f'{env}.zip',
                # ZipFile=Join("", spider_code)
            ),
            Handler="index.handler",
            Role=GetAtt(spider_lambda_role, "Arn"),
            Runtime="nodejs12.x",
            Layers=['arn:aws:lambda:us-east-1:342904801388:layer:spider-node-browser:1'],
            MemorySize=Ref(param_spider_lambda_memory_size),
            Timeout=Ref(param_spider_lambda_timeout),
            DependsOn=[spider_tasks_queue],
        )
    )

    # AllSecurityGroups = template.add_resource(CustomResource(
    #     "AllSecurityGroups",
    #     List=Ref(ExistingSecurityGroups),
    #     AppendedItem=Ref("SecurityGroup"),
    #     ServiceToken=GetAtt(spider_lambda, "Arn"),
    # ))
    #
    # SecurityGroup = template.add_resource(SecurityGroup(
    #     "SecurityGroup",
    #     SecurityGroupIngress=[
    #         {"ToPort": "80", "IpProtocol": "tcp", "CidrIp": "0.0.0.0/0",
    #          "FromPort": "80"}],
    #     VpcId=Ref(ExistingVPC),
    #     GroupDescription="Allow HTTP traffic to the host",
    #     SecurityGroupEgress=[
    #         {"ToPort": "80", "IpProtocol": "tcp", "CidrIp": "0.0.0.0/0",
    #          "FromPort": "80"}],
    # ))
    #
    # AllSecurityGroups = template.add_output(Output(
    #     "AllSecurityGroups",
    #     Description="Security Groups that are associated with the EC2 instance",
    #     Value=Join(", ", GetAtt(AllSecurityGroups, "Value")),
    # ))

    source_sns_name = f'{env}-source-sns-topic'
    source_sns_topic = template.add_resource(
        Topic(
            "SNSSource",
            TopicName=source_sns_name,
            Subscription=[
                Subscription(
                    Endpoint=GetAtt(spider_tasks_queue, "Arn"),
                    Protocol='sqs',
                )
            ],
            DependsOn=[spider_tasks_queue]
        )
    )

    source_sns_topic_policy = template.add_resource(
        TopicPolicy(
            "SourceForwardingTopicPolicy",
            PolicyDocument=PolicyDocument(
                Version="2012-10-17",
                Id="AllowS3PutMessageInSNS",
                Statement=[
                    Statement(
                        Sid="AllowS3PutMessages",
                        Principal=Principal("Service", "s3.amazonaws.com"),
                        Effect=Allow,
                        Action=[
                            Action("sns", "Publish"),
                        ],
                        Resource=["*"],
                    )
                ]
            ),
            Topics=[Ref(source_sns_topic)],
        )
    )

    sns_sqs_policy = template.add_resource(
        QueuePolicy(
            "AllowSNSPutMessagesInSQS",
            PolicyDocument=PolicyDocument(
                Version="2012-10-17",
                Id="AllowSNSPutMessagesInSQS",
                Statement=[
                    Statement(
                        Sid="AllowSNSPutMessagesInSQS2",
                        Principal=Principal("*"),
                        Effect=Allow,
                        Action=[
                            Action("sqs", "SendMessage"),
                        ],
                        Resource=["*"],
                    )
                ]
            ),
            Queues=[Ref(spider_tasks_queue)],
            DependsOn=[spider_tasks_queue],
        )
    )

    # Buckets
    source_bucket_name = f'{env}-source-bucket'
    source_bucket = template.add_resource(
        Bucket(
            "SourceBucket",
            BucketName=source_bucket_name,
            NotificationConfiguration=NotificationConfiguration(
                TopicConfigurations=[
                    TopicConfigurations(
                        Topic=Ref(source_sns_topic),
                        Event="s3:ObjectCreated:*",
                    )
                ],
            ),
            DependsOn=[source_sns_topic_policy],
        )
    )

    results_bucket_name = f'{env}-results-bucket'
    results_bucket = template.add_resource(
        Bucket(
            "ResultsBucket",
            BucketName=results_bucket_name,
        )
    )

    # Lambda trigger
    template.add_resource(
        EventSourceMapping(
            "TriggerLambdaSpiderFromSQS",
            EventSourceArn=GetAtt(spider_tasks_queue, "Arn"),
            FunctionName=Ref(spider_lambda),
            BatchSize=1,  # Default process tasks one by one
        )
    )

    return template.to_json()


def main(env):
    print(generate(env))


if __name__ == '__main__':
    env = sys.argv[1] if len(sys.argv) >= 2 else 'pilot'
    main(env)
