---
title: Linux服务器部署
date: 2026-09-14 15:37:24
tags:技术分享
---

# Linux系统与服务构建运维

## 前言

本次学习使用VMware虚拟机，系统为CentOS 7.2操作系统，镜像为清华开源软件镜像的CentOS-7-x86_64-DVD-1511.iso。SSH远程连接使用的是FinalShell。进入VMware虚拟网络编辑器需将VMnet8的子网IP改为172.16.51.0,子网掩码为255.255.255.0,网关为172.16.51.2,DHCP设置IP为172.16.51.128—172.16.51.254。虚拟机的网络适配器改为自定义VMnet8（NAT模式）来保证IP。

## 案例实施

### 1.查看IP并连接FinalShell

输入命令# ip a

eno16777736为网卡名称 up表示开启状态

### 2.修改主机名

修改主机名命令

\# hostnamectl set-hostname mall

检查命令为

\# hostnamectl

并且修改/etc/hosts配置文件：

\# vi /etc/hosts

127.0.0.1 localhost localhost.localdomain localhost4 localhost4.localdomain4

::1 localhost localhost.localdomain localhost6 localhost6.localdomain6

172.16.51.131 mall

### 3.配置本地YUM源

首先要把提供的packages包上传到/root目录下，并且配置本地local.repo文件。

修改命令：# vi /etc/yum.repos.d/local.repo

文件内容：

\[mall\]

name=mall

baseurl=file:///root/gpmall-repo

gpgcheck=0

enabled=1

### 4.关闭防火墙

因为本服务项目属于典型的微服务项目，他的架构决定了内部有大量的通信需求。但是firewalld 防火墙会默认拒绝所有的入站请求，只放行极少数的必要端口。如果不关闭防火墙的话可能就是导致网站页面无法访问。

注意：在真正的生产环境不可以随便关闭防火墙！！！

关闭防火墙命令：# systemctl stop firewalld

### 5.安装基础服务

#### 1）安装JAVA环境

安装Java环境命令：

\# yum install -y java-1.8.0-openjdk java-1.8.0-openjdk-devel

检查Java是否安装成功：# java -version

查看版本号有输出代表安装成功

#### 2）安装Redis缓存服务

安装命令：# yum install redis -y

#### 3）安装Elasticsearch服务

安装命令：# yum install elasticsearch -y

#### 4）安装Nginx服务

安装命令：# yum install nginx -y

#### 5）安装MariaDB数据库

安装命令：# yum install mariadb mariadb-server -y

#### 6）安装ZooKeeper服务

首先需要将提供的zookeeper-3.4.14.tar.gz上传至云主机的/opt内，并解压。

命令：# cd /opt

\# tar -zxvf zookeeper-3.4.14.tar.gz

进入zookeeper-3.4.14/conf目录下，将zoo_sample.cfg文件重命名为zoo.cfg

命令：# cd zookeeper-3.4.14/conf

\# mv zoo_sample.cfg zoo.cfg

进入到zookeeper-3.4.14/bin目录下，启动ZooKeeper服务

命令：# cd ..

\# cd bin

\# ./zkServer.sh start

查看ZooKeeper状态

命令：# ./zkServer.sh status

#### 7）安装Kafka服务，将提供的kafka_2.11-1.1.1.tgz包上传到云主机的/opt目录下，并解压（在/opt路径下）。

命令：# cd /opt

\# tar -zxvf kafka_2.11-1.1.1.tar

进入到kafka_2.11-1.1.1/bin目录下，启动Kafka服务

命令：# cd kafka_2.11-1.1.1/bin

\# ./kafka-server-start.sh -daemon ../config/server.properties

### 6.启动服务

#### 1）启动数据库并配置

修改数据库配置文件并启动MariaDB数据库，设置root用户密码为123456，并创建gpmall数据库，将提供的gpmall.sql导入。

修改/etc/my.cnf文件

命令：# vi /etc/my.cnf

添加字段为：

#

\# This group is read both both by the client and the server

\# use it for options that affect everything

#

\[client-server\]

#

\# include all files from the config directory

#

!includedir /etc/my.cnf.d

\[mysqld\]

init_connect='SET collation_connection = utf8_unicode_ci'

init_connect='SET NAMES utf8'

character-set-server=utf8

collation-server=utf8_unicode_ci

skip-character-set-client-handshake

启动数据库命令：

\# systemctl start mariadb

设置root用户的密码为123456并登录。

命令：# mysqladmin -uroot password 123456

\# mysql -uroot -p123456

成功的话会进入数据库并且\[root@mall ~\]会变为MariaDB \[(none)\]>

设置root用户的权限，命令：

\# grant all privileges on \*.\* to root@localhost identified by '123456' with grant option;

\# grant all privileges on \*.\* to root@"%" identified by '123456' with grant option;

将gpmall.sql文件上传至云主机的/root目录下。创建数据库gpmall并导入gpmall.sql文件。

命令：# create database gpmall;

\# use gpmall;

\# source /root/gpmall.sql

退出并设置开机自启。

退出数据库使用Ctrl-C或者exit!命令

命令：# # systemctl enable mariadb 开机自启

#### 2）启动Redis服务

修改Redis配置文件，编辑/etc/redis.conf文件。

命令：# vi /etc/redis.conf

将bind 127.0.0.1这一行注释掉；将protected-mode yes 改为 protected-mode no。

启动Redis服务命令：# systemctl start redis

\# systemctl enable redis

#### 3）配置Elasticsearch服务并启动

配置Elasticsearch服务命令：# vi /etc/elasticsearch/elasticsearch.yml

在文件最上面加入这三条语句：

http.cors.enabled: true

http.cors.allow-origin: "\*"

http.cors.allow-credentials: true

并将下面4条语句的注释符去掉，并修改network.host的IP为本机IP。

cluster.name: my-application

node.name: node-1

network.host: 172.16.51.131

http.port: 9200

然后启动Elasticsearch并设置开机自启。

命令：# systemctl start elasticsearch

\# systemctl enable elasticsearch

#### 4）启动Nginx服务

启动Nginx服务命令：

\# systemctl start nginx

\# systemctl enable nginx

## 二、案例实施

### 1.全局变量配置

修改/etc/hosts文件

命令：# vi /etc/hosts

内容：

127.0.0.1 localhost localhost.localdomain localhost4 localhost4.localdomain4

::1 localhost localhost.localdomain localhost6 localhost6.localdomain6

172.16.51.131 kafka.mall

172.16.51.131 mysql.mall

172.16.51.131 redis.mall

172.16.51.131 zookeeper.mall

### 2.部署前端

将dist目录上传至服务器的/root目录下。接着将dist目录下的文件，复制到Nginx默认项目路径（首先清空默认项目路径下的文件）。

命令：# rm -rf /usr/share/nginx/html/\*

\# cp -rvf dist/\* /usr/share/nginx/html/

修改Nginx配置文件/etc/nginx/conf.d/default.conf，添加映射。

命令：# vi /etc/nginx/conf.d/default.conf

内容：

server {

listen 80;

server_name localhost;

#charset koi8-r;

#access_log /var/log/nginx/host.access.log main;

location / {

root /usr/share/nginx/html;

index index.html index.htm;

}

location /user {

proxy_pass http://127.0.0.1:8082;

}

location /shopping {

proxy_pass http://127.0.0.1:8081;

}

location /cashier {

proxy_pass http://127.0.0.1:8083;

}

#error_page 404 /404.html;

重启Nginx服务。

命令：# systemctl restart nginx

### 3.部署后端

将提供的4个jar包上传到服务器的/root目录下，并启动。

命令：

\# nohup java -jar shopping-provider-0.0.1-SNAPSHOT.jar &

\# nohup java -jar user-provider-0.0.1-SNAPSHOT.jar &

\# nohup java -jar gpmall-shopping-0.0.1-SNAPSHOT.jar &

\# nohup java -jar gpmall-user-0.0.1-SNAPSHOT.jar &

### 4.网站访问

打开浏览器，在地址栏中输入http://172.16.51.131，访问界面。

## 注意事项总结

1.  虚拟机的内存配置最好不要设置为默认的1G会有内存不够用的情况，Elasticsearch默认在1GB内存的机器上起不来

2.上传包后最好把联网源移走不然可能继续使用联网的方式导致安装失败

3\. network.host 必须是当前真实 IP。若用 DHCP，重启后 IP 可能会变，ES 就会绑定失败——建议静态 IP 或每次重启后同步修改

4\. firewalld防火墙默认只放行ssh所以要禁用防火墙
