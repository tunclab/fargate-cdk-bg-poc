FROM public.ecr.aws/amazoncorretto/amazoncorretto:18-al2-jdk

WORKDIR /app

EXPOSE 8080

ADD build/libs/fargate-bg-0.0.1-SNAPSHOT.jar .

CMD ["java", "-jar", "fargate-bg-0.0.1-SNAPSHOT.jar"]