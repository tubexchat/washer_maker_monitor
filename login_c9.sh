#!/usr/bin/expect -f

# ==========================================
# 服务器: c9.one (c7i.xlarge)
# IP: 13.212.6.186
# 用户名: hexchange
# 密码: s-)(d+K/[Y3$AJm
# 功能: 自动填充密码并交互登录
# ==========================================

set ip "13.212.6.186"
set user "hexchange"
set password {s-)(d+K/[Y3$AJm}

# 启动 SSH 进程
spawn ssh -o StrictHostKeyChecking=no $user@$ip

# 匹配提示并发送密码
expect {
    "*password:" {
        send "$password\r"
    }
    "yes/no" {
        send "yes\r"
        expect "*password:"
        send "$password\r"
    }
}

# 保持交互状态
interact
