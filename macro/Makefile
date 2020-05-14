lambda:
	zip -j $(env).zip ./spider/index.js
	aws s3 cp $(env).zip s3://spider-lambda/ --region us-east-1

formation:
	make lambda env=$(env)
	python ./generate.py $(env) > cfn.json
	aws s3 cp cfn.json s3://cloudformations-spider/$(env).json --region us-east-1
	make clear

clear:
	rm -f *.zip