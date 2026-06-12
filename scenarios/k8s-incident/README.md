# K8s 处置场景

针对 Pod CrashLoop、节点 NotReady、Ingress 异常等场景，聚合事件与日志并给出处置建议。

## 自动安装

- Skill：`k8s-incident`
- MCP：`kubernetes`
- 环境变量：`KUBECONFIG`

## 初始化

```bash
./init.sh
```

详见 [scenarios/README.md](../README.md)。
