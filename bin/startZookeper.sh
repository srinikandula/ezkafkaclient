#!/bin/bash
#

export kafka_home=/home/ubuntu/kafka_2.11-1.0.0/

kafka_home=$KAFKA_HOME

if [ -z "$kafka_home" ]; then
        echo "ERROR: KAFKA_HOME is missing. Please export KAFKA_HOME path"
        exit 1;
fi
echo "Using $kafka_home"

is_zookeper_running=`jps -l | grep zookeeper`

echo "is_zookeper_running :$is_zookeper_running"
if [ -z "$is_zookeper_running" ]; then
    echo "WARNING: Zookeeper is not running. Hence attempting to start"
    nohup $kafka_home/bin/zookeeper-server-start.sh $kafka_home/config/zookeeper.properties > ~/zookeeper.log &
fi
sleep 3
is_zookeper_running=`jps -l | grep zookeeper`

if [ -z "$is_zookeper_running" ]; then
    echo "ERROR: Zookeeper failed to start"
    exit 1;
else
   echo "Zookeeper is Running now : $is_zookeper_running"
fi

$kafka_home/bin/kafka-topics.sh --list --zookeeper localhost:2181


#create topic
$kafka_home/bin/kafka-topics.sh --create --topic devicePositions --replication-factor 1 --partitions 3 --zookeeper localhost:2181

#stop kafka brokers
$kafka_home/bin/kafka-server-stop.sh


#stop zookeper
$kafka_home/bin/zookeeper-server-stop.sh

#start kafka brokers
nohup $kafka_home/bin/kafka-server-start.sh $kafka_home/config/server.properties > ~/kafka.log &
nohup $kafka_home/bin/kafka-server-start.sh $kafka_home/config/server-1.properties > ~/kafka-1.log &
nohup $kafka_home/bin/kafka-server-start.sh $kafka_home/config/server-2.properties > ~/kafka-2.log &


kafka_brokers=`echo dump | nc localhost 2181 | grep brokers`

echo "kafka brokers $kafka_brokers"
