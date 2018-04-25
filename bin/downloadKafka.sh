#!/bin/bash
#
KAFKA_HOME=~/kafka_2.11-1.1.0

if [ -d "$KAFKA_HOME" ]; then
  echo "Looks like kafka is already installed"
else
    if [ -e "$HOME/kafka_2.11-1.1.0.tgz" ]; then
        echo "Kafka is already downloaded"
    else
        echo "downloaing kafka..."
        wget http://www-us.apache.org/dist/kafka/1.1.0/kafka_2.11-1.1.0.tgz --directory-prefix=$HOME/
    fi
  tar xvf ~/kafka_2.11-1.1.0.tgz -C $HOME/
  export KAFKA_HOME=$HOME/kafka_2.11-1.1.0
fi



#Install Oracle JDK

sudo add-apt-repository ppa:webupd8team/java

sudo apt update; sudo apt install oracle-java8-installer