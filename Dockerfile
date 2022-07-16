FROM openjdk:11.0.15-jre-slim

WORKDIR /app

EXPOSE 8080

ADD build/libs/fargate-bg-0.0.1-SNAPSHOT.jar .

CMD ["java", "-jar", "fargate-bg-0.0.1-SNAPSHOT.jar"]