# 1. 机器学习简介
   
机器学习(Machine Learning)是人工_智能($AI$)的一个重要分支。它使_计算机系统_能够自动从数据中学习和改$2$进，无需进行明确的编程(Explicit Programming)。近年来，随着计算*能力的提升*和数据量的爆炸式增长，机器学习在各个领域$取得$了突破性进展。

\[&\]
[编辑](https://en.wikibooks.org/w/index.php?title=Windows_Batch_Scripting&veaction=edit&section=9 "Edit section: How a command is executed")

\[[编辑](https://en.wikibooks.org/w/index.php?title=Windows_Batch_Scripting&veaction=edit&section=9 "Edit section: How a command is executed") | [编辑源代码](https://en.wikibooks.org/w/index.php?title=Windows_Batch_Scripting&action=edit&section=9 "Edit section's source code: How a command is executed")\]

**[]**
## 1.1 主要学习类型

a   | b
----|----
test | content

- OK
  - OK1
  - OK2
  - [ ] Check
      1. Oh Well
    1. Hey
        - Test Indent
    1. Hey
        - [ ] OK2

列表

* 监督学习（Supervised Learning）：训练数据含有标签。
  ->测试替换->训练X数据含有标签。
* 无监督学习（Unsupervised Learning）：训练数据不含标签。
  a   | b
  ----|----
  表格内替换-> |x也必须可以执行。
  
* 半监督学习（Semi-supervised Learning）：仅有少量数据有标签。
* 强化学习（Reinforcement Learning）：通过与环境交互获得奖励信号来学习。

相邻的符号，J就**不需要**产生空格间隙`J`。

名字   | 内容
----|----
监督学习（Supervised Learning）|训练数据含有标签。训练数据含有标签。训练数据含有标签。训练数据含有标签。
无监督学习（Unsupervised Learning）|训练数据不含标签。
半监督学习（Semi-supervised Learning）|仅有少量数据有标签。
强化学习（Reinforcement Learning）|通过与环境交互获得奖励信号来学习。

## 测试混合列表

- jijsijdf。
* item2

  这些内容的收尾句号不要被删除。

## 1.2 常见算法对比

| 算法 | 准确率 | 训练速度 | 可解释性 |
|------|--------|----------|----------|
| 线性回归(Linear Regression) | 中等 | 快速 | 高 |
| 决策树(Decision Tree) | 中等 | 中等 | 高 |
| 随机森林(Random Forest) | 高 | 慢 | 中等 |
| 神经网络(Neural Network) | 很高 | 很慢 | 低 |

## 1.3 Python代码示例

下面展示如何使用sklearn库训练一个线性回归模型：

    import numpy as np
    from sklearn.linear_model import LinearRegression

    X_train = np.array([[1], [2], [3], [4], [5]])
    y_train = np.array([2, 4, 6, 8, 10])

    model = LinearRegression()
    model.fit(X_train, y_train)
    print(model.predict([[6]]))

注意: 运行前需要安装依赖：`pip install scikit-learn numpy`。

## 1.4 评估指标

常见的模型评估指标如下：

1. 均方误差（MSE，Mean Squared Error）。
2. 决定系数（R²，R-squared）。
3. 精确率（Precision）与召回率（Recall）。
4. F1分数（F1 Score）。
5. AUC-ROC曲线。

### Header3 测试

## 1.5 学习资源

* 《统计学习方法》- 李航著，机器学习入门首选。
* 《深度学习》 (Deep Learning) - Goodfellow et al.。
* Kaggle上的实战项目，适合练手。
* Arxiv.org 上的最新论文。
