---
title: Linux集群架构
date: 2026-09-17 09:52:29
tags: 技术分享
---

# 集群架构的操作步骤

## 前言

本次学习采用的是 VMware 虚拟机，系统为 CentOS 7.2 操作系统，镜像为清华开源网站的`CentOS-7-x86_64-DVD-1511.iso`文件。

虚拟机安装两台 Linux 配置为默认配置，但更改了网络连接方式为桥接模式。因此需要优先获取到宿主机的相关网络配置信息，然后来修改虚拟机的网络配置信息。

虽然 CentOS 默认的 yum 源里就有 keepalived 包，但是这些源已经于 2024 年下线了。包在源里看得见但下不下来。所以需要更换源才能够正确的安装 keepalived，才能进行后续的操作。

## 一、搭建高可用集群

### 1. 修改网络配置

因为本次使用的网络连接方式为桥接模式，所以需要优先给虚拟机配置静态 IP 地址来达到上网功能。因为桥接模式是 “寄生” 在物理网卡上的，所以要更改为和宿主机相同的网段才能够连通外网，才可以安装 keepalived。

#### 1) 查看宿主机的真实 IP

win+r 输入 cmd 并输入`ipconfig`查看宿主机的真实 IP 与网关

#### 2）修改网卡配置文件（配置静态 IP）

```
vi /etc/sysconfig/network-scripts/ifcfg-eno16777736
```

修改`BOOTPROTO`为`static`，追加如下配置：

```
IPADDR=192.168.104.161
PREFIX=24
GATEWAY=192.168.104.254
DNS1=114.114.114.114
DNS2=8.8.8.8
```

> 第二台虚拟机 IPADDR 改为`192.168.104.162`

#### 3）重启网络服务

```
systemctl restart network
```

#### 4）确认 IP

```
ip a
```

#### 5) 关闭防火墙

关闭防火墙防止遇到奇怪的错误

```
systemctl stop firewalld
systemctl disable firewalld
```

### 2. 修改主机名

master 节点 (192.168.104.161)

```
hostnamectl set-hostname master
bash
```

backup 节点 (192.168.104.162)

```
hostnamectl set-hostname backup
bash
```

### 3. 安装 keepalived

#### 1）确认归档站可达（输出 200）

```
curl -s -o /dev/null -w "%{http_code}\n" https://mirrors.aliyun.com/centos-vault/7.2.1511/os/x86_64/repodata/repomd.xml
```

#### 2）将原源移走备份

```
mkdir -p /root/repo.bak
mv /etc/yum.repos.d/CentOS-*.repo /root/repo.bak/
```

#### 3）写入阿里云的归档源

```
cat > /etc/yum.repos.d/CentOS-Vault.repo <<'EOF'
[centos-vault-os]
name=CentOS-7.2.1511 - os - aliyun vault
baseurl=https://mirrors.aliyun.com/centos-vault/7.2.1511/os/$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
enabled=1

[centos-vault-updates]
name=CentOS-7.2.1511 - updates - aliyun vault
baseurl=https://mirrors.aliyun.com/centos-vault/7.2.1511/updates/$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
enabled=1

[centos-vault-extras]
name=CentOS-7.2.1511 - extras - aliyun vault
baseurl=https://mirrors.aliyun.com/centos-vault/7.2.1511/extras/$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
enabled=1
EOF
```

#### 4）清理并重建 yum 缓存

```
yum clean all
yum makecache
```

#### 5）安装 keepalived

```
yum install -y keepalived
```

### 4. 安装 Nginx

加 EPEL 归档源

```
cat > /etc/yum.repos.d/EPEL-Archive.repo <<'EOF'
[epel-archive]
name=EPEL-7 Archive - aliyun
baseurl=https://mirrors.aliyun.com/epel-archive/7/x86_64/
gpgcheck=1
gpgkey=https://mirrors.aliyun.com/epel/RPM-GPG-KEY-EPEL-7
enabled=1
EOF

yum install -y nginx
```

### 5. 编辑 keepalived 配置文件

```
vim /etc/keepalived/keepalived.conf
```

配置内容：

```
global_defs {
  notification_email {
    131917381@qq.com
  }
  notification_email_from root@aaaaa.com
  smtp_server 127.0.0.1
  smtp_connect_timeout 30
  router_id LVS_DEVEL
}

vrrp_script chk_nginx {
  script "/usr/local/sbin/check_ng.sh"
  interval 3
}

vrrp_instance VI_1 {
  state MASTER
  interface eno16777736
  virtual_router_id 51
  priority 100
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass 5201314>g
  }
  virtual_ipaddress {
    192.168.104.100
  }
  track_script {
    chk_nginx
  }
}
```

> keepalived 要实现高可用，还需要监控 Nginx，它自己本身没有这个功能，需要借助自定义脚本。

编写 Nginx 监控脚本

```
vim /usr/local/sbin/check_ng.sh
```

脚本内容：

```
#!/bin/bash
#时间变量，用于记录日志
d=`date --date today +%Y%m%d_%H:%M:%S`
#计算nginx进程数量
n=`ps -C nginx --no-heading|wc -l`
#如果进程为0，则启动nginx，并且再次检测
if [ $n -eq "0" ]; then
    systemctl start nginx
    n2=`ps -C nginx --no-heading|wc -l`
    if [ $n2 -eq "0"  ]; then
        echo "$d nginx down,keepalived will stop" >> /var/log/check_ng.log
        systemctl stop keepalived
    fi
fi
```

赋予执行权限

```
chmod a+x /usr/local/sbin/check_ng.sh
```

> ⚠️backup 节点：keepalived 配置中`state BACKUP`、`priority 90`，其余配置、脚本、权限和 master 保持一致。

启动服务（master）

```
systemctl start keepalived
systemctl start nginx
```

### 6. 验证 keepalived 高可用

```
# 查看VIP
ip a

# 访问VIP
curl -I 192.168.104.100

# 模拟master故障
systemctl stop keepalived
curl -I 192.168.104.100

# 恢复master
systemctl start keepalived
curl -I 192.168.104.100
```

### 7. 总结

- **Keepalived**：高可用软件
- **高可用（HA）**：故障时自动顶替
- **VIP（虚拟 IP）**：漂移 IP
- **VRRP（虚拟路由冗余协议）**：心跳协议、选主协议
- **Master / Backup**：主节点 / 备节点
- **健康检查（check_ng.sh）**：自定义脚本
- **Nginx**：流量大管家

## 二、搭建负载均衡集群

### 1. 在 NAT 模式下 LVS 搭建

准备： 首先需要准备 3 台虚拟机，一台作为作为调度器，另外两台模拟真实的服务器。调度器需要有两个 IP，一个公网 IP，一个内网 IP，所以需要设置两张网卡。另外两个模拟服务器只需要内网 IP 就可以了。

调度器 dir 两张网卡模式分别为 NAT 模式（外网）和仅主机模式（内网）另外两台真实服务器都为仅主机模式（内网）。

表格

| 主机       | IP                                             | 模式         |
| ---------- | ---------------------------------------------- | ------------ |
| dir 调度器 | 172.16.51.134（外网）、192.168.199.130（内网） | NAT + 仅主机 |
| rs1        | 192.168.199.131                                | 仅主机       |
| rs2        | 192.168.199.132                                | 仅主机       |

#### 1). 修改网络配置

> rs1 和 rs2 的网关为 dir 内网 IP：`192.168.199.130`

修改网卡配置

```
vi /etc/sysconfig/network-scripts/ifcfg-xxx
systemctl restart network
```

#### 2). 修改主机名

```
hostnamectl set-hostname dir
bash

hostnamectl set-hostname rs1
bash

hostnamectl set-hostname rs2
bash
```

#### 3). 关闭防火墙 & 清空 iptables

三台机器全部执行

```
systemctl stop firewalld
systemctl disable firewalld

iptables -F
iptables -t nat -F
service iptables save
```

#### 4). dir 安装 ipvsadm（使用阿里归档源）

```
mkdir -p /root/repo.bak
mv /etc/yum.repos.d/CentOS-*.repo /root/repo.bak/

cat > /etc/yum.repos.d/CentOS-Vault.repo <<'EOF'
[centos-vault-os]
name=CentOS-7.2.1511 - os - aliyun vault
baseurl=https://mirrors.aliyun.com/centos-vault/7.2.1511/os/$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
enabled=1

[centos-vault-updates]
name=CentOS-7.2.1511 - updates - aliyun vault
baseurl=https://mirrors.aliyun.com/centos-vault/7.2.1511/updates/$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
enabled=1

[centos-vault-extras]
name=CentOS-7.2.1511 - extras - aliyun vault
baseurl=https://mirrors.aliyun.com/centos-vault/7.2.1511/extras/$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
enabled=1
EOF

yum clean all
yum makecache
yum install -y ipvsadm
```

#### 5). dir 编写 LVS-NAT 脚本

```
vim /usr/local/sbin/lvs_nat.sh
```

脚本内容

```
#!/bin/bash
# director 服务器上开启路由转发功能
echo 1 > /proc/sys/net/ipv4/ip_forward
# 关闭icmp的重定向
echo 0 > /proc/sys/net/ipv4/conf/all/send_redirects
echo 0 > /proc/sys/net/ipv4/conf/default/send_redirects
# 注意区分网卡名字
echo 0 > /proc/sys/net/ipv4/conf/ens33/send_redirects
echo 0 > /proc/sys/net/ipv4/conf/ens34/send_redirects

# director 设置nat防火墙
iptables -t nat -F
iptables -t nat -X
iptables -t nat -A POSTROUTING -s 192.168.199.0/24 -j MASQUERADE

# director设置ipvsadm
IPVSADM='/usr/sbin/ipvsadm'
$IPVSADM -C
$IPVSADM -A -t 172.16.51.134:80 -s wlc
$IPVSADM -a -t 172.16.51.134:80 -r 192.168.199.131:80 -m -w 1
$IPVSADM -a -t 172.16.51.134:80 -r 192.168.199.132:80 -m -w 1
```

赋予权限并执行

```
chmod +x /usr/local/sbin/lvs_nat.sh
bash /usr/local/sbin/lvs_nat.sh
```

#### 6). 给 rs1、rs2 部署 Nginx（内网机器无法联网，dir 下载 rpm 包分发）

> dir 机器下载 nginx rpm 包，scp 传到 rs1 rs2，本地 yum 安装。 修改 rs1、rs2 首页用于区分节点

```
# rs1
echo "rs1" > /usr/share/nginx/html/index.html
systemctl start nginx
systemctl enable nginx

# rs2
echo "rs2" > /usr/share/nginx/html/index.html
systemctl start nginx
systemctl enable nginx
```

dir 测试连通后端

```
curl 192.168.199.131
curl 192.168.199.132
```

访问 dir 外网 IP`172.16.51.134`验证负载均衡。

> 脚本中`-p`是持久会话，测试时删除`-p 300`，重新执行脚本：

```
vim /usr/local/sbin/lvs_nat.sh
bash /usr/local/sbin/lvs_nat.sh
```

### 2. DR 模式 LVS 搭建

IP 规划：

- dir 调度器：`192.168.199.130`
- rs1：`192.168.199.131`
- rs2：`192.168.199.132`
- VIP：`192.168.199.110`

> DR 模式 rs 网关不能指向 dir，修改为真实网关`192.168.199.1`

rs1、rs2 修改网卡配置

```
vi /etc/sysconfig/network-scripts/ifcfg-eno16777736
# GATEWAY=192.168.199.1
systemctl restart network
```

#### dir 编写 lvs_dr.sh

```
vim /usr/local/sbin/lvs_dr.sh
#!/bin/bash
echo 1 > /proc/sys/net/ipv4/ip_forward
ipv=/usr/sbin/ipvsadm
vip=192.168.199.110
rs1=192.168.199.131
rs2=192.168.199.132

#绑定VIP到网卡子接口，修改为你的内网网卡
ifconfig eno33554976:2 $vip broadcast $vip netmask 255.255.255.255 up
route add -host $vip dev eno33554976:2

$ipv -C
$ipv -A -t $vip:80 -s wrr
$ipv -a -t $vip:80 -r $rs1:80 -g -w 1
$ipv -a -t $vip:80 -r $rs2:80 -g -w 1
```

#### rs1、rs2 编写 lvs_rs.sh

```
vim /usr/local/sbin/lvs_rs.sh
#!/bin/bash
vip=192.168.199.110

#把vip绑定在lo上，rs直接把结果返回给客户端
ifconfig lo:0 $vip broadcast $vip netmask 255.255.255.255 up
route add -host $vip lo:0

#更改arp内核参数
echo "1" > /proc/sys/net/ipv4/conf/lo/arp_ignore
echo "2" > /proc/sys/net/ipv4/conf/lo/arp_announce
echo "1" > /proc/sys/net/ipv4/conf/all/arp_ignore
echo "2" > /proc/sys/net/ipv4/conf/all/arp_announce
```

执行脚本

```
# dir执行
chmod +x /usr/local/sbin/lvs_dr.sh
bash /usr/local/sbin/lvs_dr.sh

# rs1 rs2执行
chmod +x /usr/local/sbin/lvs_rs.sh
bash /usr/local/sbin/lvs_rs.sh
```

### 3. keepalived+LVS (DR 模式)

dir 安装 keepalived

```
yum install -y keepalived
```

清空原有配置，写入 keepalived 完整 LVS-DR 配置

```
> /etc/keepalived/keepalived.conf
vim /etc/keepalived/keepalived.conf
vrrp_instance VI_1 {
  state MASTER
  interface eno33554976
  virtual_router_id 51
  priority 100
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass 1111
  }
  virtual_ipaddress {
    192.168.199.110
  }
}

virtual_server 192.168.199.110 80 {
  delay_loop 10
  lb_algo wlc
  lb_kind DR
  persistence_timeout 0
  protocol TCP

  real_server 192.168.199.131 80 {
    weight 100
    TCP_CHECK {
      connect_timeout 10
      nb_get_retry 3
      delay_before_retry 3
      connect_port 80
    }
  }

  real_server 192.168.199.132 80 {
    weight 100
    TCP_CHECK {
      connect_timeout 10
      nb_get_retry 3
      delay_before_retry 3
      connect_port 80
    }
  }
}
```

清理旧 LVS 规则

```
ipvsadm -C
systemctl restart network
```

rs1、rs2 执行 arp 调优脚本

```
bash /usr/local/sbin/lvs_rs.sh
```

dir 启动 keepalived

```
systemctl start keepalived
ps aux |grep keepalived
```

#### 检验

浏览器访问 VIP：`192.168.199.110`

```
# 关闭rs2 nginx模拟故障
systemctl stop nginx

# 查看LVS状态
ipvsadm -ln

# 恢复rs2
systemctl start nginx
ipvsadm -ln
```

> 浏览器强制刷新 `Ctrl+F5`，规避缓存。

### 4. 总结

- **LVS**：Linux 的负载均衡器，负责把请求分给多台服务器。
- **NAT**：改 IP 地址，让内网机器共享公网或转发请求。
- **DR**：LVS 的一种模式，只改 MAC 地址，回包不经过调度器，速度快。
- **iptables**：Linux 防火墙，也能做 NAT 地址转换。
