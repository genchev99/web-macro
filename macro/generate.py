from awacs.aws import PolicyDocument, Statement, Principal, Allow, Action
from troposphere.constants import NUMBER
from troposphere import FindInMap, GetAtt, Join, Output
from troposphere import Parameter, Ref, Template
from troposphere.awslambda import Function, Code, MEMORY_VALUES
from troposphere.cloudformation import CustomResource
from troposphere.ec2 import SecurityGroup
from troposphere.iam import Role, Policy
from troposphere.s3 import Bucket, NotificationConfiguration, TopicConfigurations
from troposphere.sns import Topic, Subscription, TopicPolicy

stage = 'pilot'
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

param_spider_lambda_memory_size = template.add_parameter(Parameter(
    'SpiderLambdaMemorySize',
    Type=NUMBER,
    Description='Amount of memory to allocate to the Lambda Function',
    Default='128',
    AllowedValues=MEMORY_VALUES
))

param_spider_lambda_timeout = template.add_parameter(Parameter(
    'SpiderLambdaTimeout',
    Type=NUMBER,
    Description='Timeout in seconds for the Lambda function',
    Default='60'
))

spider_file_path = './spider/index.js'
spider_code = open(spider_file_path, 'r').read().splitlines()
spider_lambda = template.add_resource(Function(
    "SpiderLambda",
    Code=Code(
        ZipFile=Join("", spider_code)
    ),
    Handler="index.handler",
    Role=GetAtt("SpiderLambdaRole", "Arn"),
    Runtime="nodejs12.x",
    MemorySize=Ref(param_spider_lambda_memory_size),
    Timeout=Ref(param_spider_lambda_timeout)
))

spider_lambda_role = template.add_resource(Role(
    "SpiderLambdaRole",
    Path="/",
    Policies=[Policy(
        PolicyName="root",
        PolicyDocument={
            "Version": "2012-10-17",
            "Statement": [{
                "Action": ["logs:*"],
                "Resource": "arn:aws:logs:*:*:*",
                "Effect": "Allow"
            }]
        })],
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
))

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


# source_sns_subscription = Subscription(
#     "SNSSourceSubscription",
#     Endpoint=source_bucket,
#     Protocol='sqs',
# )

source_sns_name = f'{stage}-source-sns-topic'
source_sns_topic = template.add_resource(Topic(
    "SNSSource",
    TopicName=source_sns_name,
    # Subscription=[
    #     Subscription(
    #
    #     )
    # ],
))

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

# Buckets
source_bucket_name = f'{stage}-source-bucket'
source_bucket = template.add_resource(Bucket(
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
    # DependsOn=[Ref(source_sns)]
    DependsOn=[source_sns_topic_policy]
))

results_bucket_name = f'{stage}-results-bucket'
results_bucket = template.add_resource(Bucket(
    "ResultsBucket",
    BucketName=results_bucket_name,
))

print(template.to_json())
