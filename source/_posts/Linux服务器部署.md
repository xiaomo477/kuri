---
title: Linux服务器部署
date: 2026-09-14 15:37:24
tags: 技术分享
---

# Linux系统与服务构建运维

## 前言

本次学习基于 VMware 虚拟机，操作系统为 CentOS 7.2，镜像为清华开源软件镜像站的 `CentOS-7-x86_64-DVD-1511.iso`，远程连接工具为 FinalShell。

在 VMware 虚拟网络编辑器中，将 VMnet8 的子网 IP 设置为 `172.16.51.0`，子网掩码为 `255.255.255.0`，网关为 `172.16.51.2`，DHCP 范围为 `172.16.51.128—172.16.51.254`。虚拟机网络适配器选择“自定义 VMnet8（NAT 模式）”，以保证 IP 配置正常。

> 说明：以下命令默认以 root 用户执行；Shell 命令均放在 `bash` 代码块中，配置文件内容使用对应格式代码块展示。

## 一、基础环境与依赖服务部署

### 1. 查看 IP 并连接 FinalShell

```bash
ip a
```

输出中 `eno16777736` 为网卡名称，`up` 表示网卡处于开启状态。

### 2. 修改主机名

```bash
hostnamectl set-hostname mall
hostnamectl
```

修改 `/etc/hosts` 配置文件：

```bash
vi /etc/hosts
```

加入或确认以下内容：

```text
127.0.0.1 localhost localhost.localdomain localhost4 localhost4.localdomain4
::1 localhost localhost.localdomain localhost6 localhost6.localdomain6
172.16.51.131 mall
```

### 3. 配置本地 YUM 源

将提供的 packages 包上传到 `/root` 目录，并配置本地 `local.repo` 文件。

```bash
vi /etc/yum.repos.d/local.repo
```

文件内容如下：

```ini
[mall]
name=mall
baseurl=file:///root/gpmall-repo
gpgcheck=0
enabled=1
```

### 4. 关闭防火墙

本服务项目属于典型的微服务项目，内部存在大量通信需求。`firewalld` 默认会拒绝所有入站请求，仅放行极少数必要端口。若不关闭防火墙，可能导致网站页面无法访问。

> 注意：生产环境不可随意关闭防火墙，应按需放行端口。

```bash
systemctl stop firewalld
```

### 5. 安装基础服务

#### 1）安装 Java 环境

```bash
yum install -y java-1.8.0-openjdk java-1.8.0-openjdk-devel
java -version
```

若正确输出版本号，说明安装成功。

#### 2）安装 Redis 缓存服务

```bash
yum install redis -y
```

#### 3）安装 Elasticsearch 服务

```bash
yum install elasticsearch -y
```

#### 4）安装 Nginx 服务

```bash
yum install nginx -y
```

#### 5）安装 MariaDB 数据库

```bash
yum install mariadb mariadb-server -y
```

#### 6）安装 ZooKeeper 服务

将提供的 `zookeeper-3.4.14.tar.gz` 上传至云主机 `/opt` 目录，并解压。

```bash
cd /opt
tar -zxvf zookeeper-3.4.14.tar.gz
```

进入 `zookeeper-3.4.14/conf` 目录，将 `zoo_sample.cfg` 重命名为 `zoo.cfg`：

```bash
cd /opt/zookeeper-3.4.14/conf
mv zoo_sample.cfg zoo.cfg
```

进入 `zookeeper-3.4.14/bin` 目录，启动 ZooKeeper 服务：

```bash
cd /opt/zookeeper-3.4.14/bin
./zkServer.sh start
```

查看 ZooKeeper 状态：

```bash
./zkServer.sh status
```

#### 7）安装 Kafka 服务

将提供的 `kafka_2.11-1.1.1.tgz` 上传到云主机 `/opt` 目录，并解压：

```bash
cd /opt
tar -zxvf kafka_2.11-1.1.1.tgz
```

进入 `kafka_2.11-1.1.1/bin` 目录，启动 Kafka 服务：

```bash
cd /opt/kafka_2.11-1.1.1/bin
./kafka-server-start.sh -daemon ../config/server.properties
```

### 6. 启动服务

#### 1）启动数据库并配置

修改数据库配置文件并启动 MariaDB，设置 root 用户密码为 `123456`，创建 `gpmall` 数据库，并导入 `gpmall.sql`。

修改 `/etc/my.cnf`：

```bash
vi /etc/my.cnf
```

添加以下字段：

```ini
[mysqld]
init_connect='SET collation_connection = utf8_unicode_ci'
init_connect='SET NAMES utf8'
character-set-server=utf8
collation-server=utf8_unicode_ci
skip-character-set-client-handshake
```

启动数据库：

```bash
systemctl start mariadb
```

设置 root 用户密码为 `123456` 并登录：

```bash
mysqladmin -uroot password 123456
mysql -uroot -p123456
```

登录成功后，提示符会变为 `MariaDB [(none)]>`。执行以下 SQL 设置 root 权限：

```sql
grant all privileges on *.* to root@localhost identified by '123456' with grant option;
grant all privileges on *.* to root@"%" identified by '123456' with grant option;
```

将 `gpmall.sql` 文件上传至云主机 `/root` 目录，创建数据库 `gpmall` 并导入：

```sql
create database gpmall;
use gpmall;
source /root/gpmall.sql;
```

退出数据库：

```sql
exit;
```

设置 MariaDB 开机自启：

```bash
systemctl enable mariadb
```

#### 2）启动 Redis 服务

修改 Redis 配置文件：

```bash
vi /etc/redis.conf
```

将 `bind 127.0.0.1` 这一行注释掉，并将 `protected-mode yes` 改为 `protected-mode no`：

```ini
# bind 127.0.0.1
protected-mode no
```

启动 Redis 并设置开机自启：

```bash
systemctl start redis
systemctl enable redis
```

#### 3）配置并启动 Elasticsearch 服务

编辑 Elasticsearch 配置文件：

```bash
vi /etc/elasticsearch/elasticsearch.yml
```

在文件最上方加入以下内容：

```yaml
http.cors.enabled: true
http.cors.allow-origin: "*"
http.cors.allow-credentials: true
```

取消以下 4 条配置的注释，并将 `network.host` 修改为本机 IP：

```yaml
cluster.name: my-application
node.name: node-1
network.host: 172.16.51.131
http.port: 9200
```

启动 Elasticsearch 并设置开机自启：

```bash
systemctl start elasticsearch
systemctl enable elasticsearch
```

#### 4）启动 Nginx 服务

```bash
systemctl start nginx
systemctl enable nginx
```

## 二、应用部署与访问

### 1. 全局变量配置

修改 `/etc/hosts` 文件：

```bash
vi /etc/hosts
```

加入以下内容：

```text
127.0.0.1 localhost localhost.localdomain localhost4 localhost4.localdomain4
::1 localhost localhost.localdomain localhost6 localhost6.localdomain6
172.16.51.131 mall
172.16.51.131 kafka.mall
172.16.51.131 mysql.mall
172.16.51.131 redis.mall
172.16.51.131 zookeeper.mall
```

### 2. 部署前端

将 `dist` 目录上传至服务器 `/root` 目录，然后把 `dist` 目录下的文件复制到 Nginx 默认项目路径。复制前先清空默认项目路径下的文件：

```bash
cd /root
rm -rf /usr/share/nginx/html/*
cp -rvf dist/* /usr/share/nginx/html/
```

修改 Nginx 配置文件 `/etc/nginx/conf.d/default.conf`，添加映射：

```bash
vi /etc/nginx/conf.d/default.conf
```

配置内容如下：

```nginx
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
}
```

重启 Nginx 服务：

```bash
systemctl restart nginx
```

### 3. 部署后端

将提供的 4 个 jar 包上传到服务器 `/root` 目录，并依次启动：

```bash
cd /root
nohup java -jar shopping-provider-0.0.1-SNAPSHOT.jar &
nohup java -jar user-provider-0.0.1-SNAPSHOT.jar &
nohup java -jar gpmall-shopping-0.0.1-SNAPSHOT.jar &
nohup java -jar gpmall-user-0.0.1-SNAPSHOT.jar &
```

### 4. 网站访问

打开浏览器，在地址栏输入：

```text
http://172.16.51.131
```

即可访问部署好的网站。

## 注意事项总结

1. 虚拟机内存不要使用默认的 1G，容易出现内存不足。Elasticsearch 在 1GB 内存的机器上通常无法启动。
2. 上传安装包后，最好将联网 YUM 源移走，否则可能继续走联网源安装，导致安装失败。
3. `network.host` 必须是当前真实 IP。若使用 DHCP，重启后 IP 可能变化，Elasticsearch 会绑定失败。建议配置静态 IP，或在每次重启后同步修改。
4. `firewalld` 默认只放行 SSH，因此需要禁用防火墙；生产环境中应改为按需放行端口，而不是直接关闭。
