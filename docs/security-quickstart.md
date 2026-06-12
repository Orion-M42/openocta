# 安全策略快速上手（Sandbox / Validator / Approval Queue）

适合快速配置与分享的简明介绍，帮助你在几分钟内为 Agent 加上安全边界。

---

## 一、安全策略能解决什么问题？

Agent 会执行命令、读写文件、访问网络。如果不加约束：

- 一次「帮我清理磁盘」可能误删重要数据
- 一次「帮我测试 API」可能访问不该访问的内网/外网地址
- 一次「帮我排查网络问题」可能执行危险命令（`rm -rf`、`dd`、`mkfs` 等）

**安全策略（Security）** 由三部分组成：

- **Sandbox（沙箱）**：限制文件系统路径 / 网络访问 / 资源占用
- **Validator（命令校验）**：对命令做黑名单校验（禁止命令/参数/关键词熔断/长度）
- **Approval Queue（审批队列）**：敏感操作进入审批队列，只有人工批准才会执行

一句话：**让 Agent 既能干活，又不会越界。**

---

## 二、一分钟快速开启

1. **打开配置**  
   控制台 → **Agent** → **安全策略**。

2. **开启沙箱**  
   沙箱折叠框中点击 **开启**，保存后会写入 `~/.openocta/openocta.json` 的：

   ```json
   {
     "security": {
       "sandbox": {
         "enabled": true
       }
     }
   }
   ```

3. **允许路径**（一行一个）：

   ```text
   /tmp
   ./workspace
   ```

   - 为空时，默认允许 `<ProjectRoot>/workspace`、`<ProjectRoot>/shared`。
   - 建议只放业务需要的目录，例如挂载的数据目录、日志目录等。

4. **网络白名单**（一行一个）：

   ```text
   localhost
   127.0.0.1
   *.anthropic.com
   ```

   - 只允许访问白名单中的地址/域名，其余全部拒绝。

5. **资源限制（可选，默认已给出安全值）**

   若你不填写，保存时会自动写入下列默认值：

   - 最大 CPU：默认 **60%**
   - 最大内存：默认 **1GiB**
   - 最大磁盘：默认 **1GiB**

   你也可以手动填写（例如：`80`、`2G`、`512M` 等），前端会解析成字节数写入：

   ```json
   "security": {
     "sandbox": {
       "resourceLimit": {
         "maxCpuPercent": 60,
         "maxMemoryBytes": 1073741824,
         "maxDiskBytes": 1073741824
       }
     }
   }
   ```

6. **保存**  
   点击 **保存**，下次对话即按新规则生效。

---

## 三、效果展示

### 3.1 文件与网络被拦截时

当 Agent 尝试访问未允许的路径或域名时，沙箱会拦截并返回错误，例如：

```text
❌ 访问 /etc/passwd 被拒绝（不在允许路径内）
❌ 请求 https://unknown-api.com 被拒绝（不在网络白名单）
```

你只需把需要放行的路径和域名加入「允许路径」「网络白名单」即可。

### 3.2 危险命令被拦截时（Validator）

若配置了命令校验（如禁止 `rm -rf`、`sudo`），Agent 输出或工具调用中的危险片段会被拦截：

```text
❌ 命令包含关键词熔断: rm -rf
```

典型配置：

- 禁止命令：`dd`、`mkfs`、`sudo`
- 禁止参数：`--no-preserve-root`、`/dev/`
- 关键词熔断：`rm -rf`、`rm -r`（命令中只要包含这些片段就会被拒绝）

### 3.3 审批队列生效时（Approval Queue）

当开启审批队列后，敏感命令会进入审批流程：

1. 请求会进入 **审批队列**（控制台 → Agent → 审批队列）
2. 列表展示：Session Key、命令、超时时间、TTL 等
3. 你可选择：
   - **批准**：仅允许当前请求执行，不加入白名单，后续相同命令仍需审批
   - **全部放行**：允许当前请求并加入白名单，TTL 有效期内相同命令自动通过
   - **拒绝**：拒绝执行（可填原因）
4. 配置命令规则（可选）：
   - **自动允许命令**：`ls`、`pwd`、`echo` 等只读命令无需审批
   - **需要审批的命令**：`rm`、`mv`、`cp` 等修改类命令需要审批
   - **禁止执行的命令**：`sudo`、`dd`、`mkfs` 等高危命令始终禁止

---

## 四、典型配置示例（复制即用）

```json
{
  "security": {
    "sandbox": {
      "enabled": true,
      "allowedPaths": ["/tmp", "./workspace"],
      "networkAllow": ["localhost", "127.0.0.1"],
      "resourceLimit": {
        "maxCpuPercent": 60,
        "maxMemoryBytes": 1073741824,
        "maxDiskBytes": 1073741824
      }
    },
    "validator": {
      "enabled": true,
      "banCommands": ["dd", "mkfs", "sudo"],
      "banArguments": ["--no-preserve-root", "/dev/"],
      "banFragments": ["rm -rf"]
    },
    "approvalQueue": {
      "enabled": true,
      "timeoutSeconds": 300,
      "allow": ["ls", "pwd", "echo", "cat"],
      "ask": ["rm", "mv", "cp", "curl", "wget"],
      "deny": ["sudo", "dd", "mkfs", "fdisk"]
    }
  }
}
```

保存到 `~/.openocta/openocta.json` 或通过控制台 **安全策略** 页编辑并保存（从根级 `security` 进入）。

---

## 五、常见问题

- **不生效？**  
  确认 `security.sandbox.enabled` 为 true，且保存后已刷新或重新发起对话。

- **路径/网络被拦？**  
  把需要放行的路径或域名加入「允许路径」「网络白名单」。

- **审批队列为空？**
  当前仅展示已有审批请求；由 Agent 执行时触发的审批会出现在列表中。

- **「批准」和「全部放行」有什么区别？**
  - 「批准」仅允许当前请求执行，不加入白名单，后续相同命令仍需审批
  - 「全部放行」允许当前请求并加入白名单，TTL 有效期内相同命令自动通过

- **如何配置命令免审？**
  在审批队列配置中，将常用只读命令（如 `ls`、`pwd`、`echo`）加入「自动允许命令」列表。

- **命令还是太“自由”？**  
  补充 `validator.banCommands` / `banArguments` / `banFragments`，对高危运维命令进行更严格约束。

更多技术细节请参考《安全策略（Sandbox / Validator / Approval Queue）技术文档》（`security.md`）。

