# 1. 机器学习简介

机器学习(Machine Learning)是人工智能(AI)的一个重要分支。它使计算机系统能够自动从数据中学习和改进，无需进行明确的编程(Explicit Programming)。近年来，随着计算能力的提升和数据量的爆炸式增长，机器学习在各个领域取得了突破性进展。



## 1.1 主要学习类型

- 监督学习（Supervised Learning）：训练数据含有标签
- 无监督学习（Unsupervised Learning）：训练数据不含标签
- 半监督学习（Semi-supervised Learning）：仅有少量数据有标签
- 强化学习（Reinforcement Learning）：通过与环境交互获得奖励信号来学习



## 1.2 常见算法对比





## 1.3 Python代码示例

下面展示如何使用sklearn库训练一个线性回归模型：

```
import numpy as np
from sklearn.linear_model import LinearRegression

X_train = np.array([[1], [2], [3], [4], [5]])
y_train = np.array([2, 4, 6, 8, 10])

model = LinearRegression()
model.fit(X_train, y_train)
print(model.predict([[6]]))
```

注意： 运行前需要安装依赖：`pip install scikit-learn numpy`。



## 1.4 评估指标

常见的模型评估指标如下：

1. 均方误差（MSE，Mean Squared Error）
1. 决定系数（R²，R-squared）
1. 精确率（Precision）与召回率（Recall）
1. F1分数（F1 Score）
1. AUC-ROC曲线

### Header3 测试



## 1.5 学习资源

- 《统计学习方法》- 李航著，机器学习入门首选
- 《深度学习》 (Deep Learning) - Goodfellow et al.
- Kaggle上的实战项目，适合练手
- Arxiv.org 上的最新论文
