# 1. 机器学习简介
   

机器学习(Machine Learning)是人工_智能($AI$)的一个重要分支。它使_计算机系统_能够自动从数据中学习和改$2$进，无需进行明确的编程(Explicit Programming)。近年来，随着计算*能力的提升*和数据量的爆炸式增长，机器学习在各个领域$取得$了突破性进展。

1. 所以 T(V_n)也是线性空间

---

- item1
  $$ok \\
  but$$
- item2
  cool

  content:
  a   | b
  ----|----
  x   | v
- item3

---

- 点 $a$
  content1。
  
  content2
- item2

---

\[&\]
[编辑](https://en.wikibooks.org/w/index.php?title=Windows_Batch_Scripting&veaction=edit&section=9 "Edit section: How a command is executed")

\[[编辑](https://en.wikibooks.org/w/index.php?title=Windows_Batch_Scripting&veaction=edit&section=9 "Edit section: How a command is executed") | [编辑源代码](https://en.wikibooks.org/w/index.php?title=Windows_Batch_Scripting&action=edit&section=9 "Edit section's source code: How a command is executed")\]

-   dir \*.txt  -   匹配 Myfile.txt、Plan.txt 以及其他任何带有 .txt extension 的文件。
    
-   dir \*txt  -   不必包含 period。不过，这样也会匹配那些不使用 period 约定命名的文件，例如 myfiletxt。
    
-   ren \*.cxx \*.cpp  -   将所有带有 .cxx extension 的文件重命名为使用 .cpp extension。
    
-   dir a?b.txt  -   匹配 aab.txt、abb.txt、a0b.txt 等文件。
  -   不匹配 ab.txt，因为后面跟着的字符既不是 question mark 也不是 period 时，question mark 不能匹配零个字符。
  -   不匹配 a.b.txt，因为 question mark 不能匹配 period。
    
-   dir ???.txt  -   会匹配 .txt、a.txt、aa.txt 和 aaa.txt 等，因为这个序列中后面跟着 period 的每个 question mark 都可以匹配零个字符。
    
-   dir a???.b???.txt???  -   会匹配 a.b.txt 等文件。尽管最后那串 question marks 后面并没有跟着 period，但它仍位于 file name 某个最长无 period 部分的末尾。
    
-   dir ????????.txt & @REM eight question marks  -   与 \*.txt 匹配到相同的文件，因为每个文件还都有一个 short file name，而该名称在 .txt 之前最多不超过 8 个字符。

C:\\Windows\\System32\\notepad.exe
C:\Windows\System32\notepad.exe
C:\\PROGRA~2\\WINDOW~3\\ACCESS~1\\wordpad.exe

1. abc
11. abc

stackoverflow.com
- pack
- list
- test

好吧 $_

- * (asterisk)
- **(asterisk)**

Ordered List:
1. * ok

Other List:

* not good  
  but   ok

[list: style="table"]
- pack  
-   echo 1&echo 2&echo 3
  - list
  -   list

1.   echo 1&echo 2&echo 3
   1. list
   1.   list

- test

<!-- Hey -->
>> Hello

**[]**

## 1.1.2 测试表格

a   | b
----|----
ok | 你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好
hello | world

- 下一张表
  a | b | c | d
  ----|--|--|-
  banana | apple | orange | grape
  ok | good | 你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好你好 | hello
  fine | world | morning | evening

## 1.1.2 测试数学公式

你好，这是$数学公式$，很好 $f(x) = ax + b$。

$$one line equation$$

下面测试公式块：
$$two line equation$$

* what ?

- 计算

  $$f(x) = ax + \\
  b$$

$$\left \{
\right.$$

## 1.1.2 主要学习类型


a  | b
----|----
x  | y

-   list
  content
  a   | b
  ----|----
  x   | y
  - second list

set <NUL /p=Output of a command

[table: title="标题"]
a   | b
----|----
x | y

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

代码块：
```cpp
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
```

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


















---End---





