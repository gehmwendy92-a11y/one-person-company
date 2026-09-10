# 部署到 Vercel · 零基础完整指南

> 这份文档是给你（Monna）看的，每一步都按"零基础"写。  
> 如果中途卡住，回到这里对照一下，应该都能找到答案。

---

## 0. 先理解我们要做什么（30 秒）

我们的网站现在在你电脑里（`my-one-person-company/` 文件夹），别人访问不到。  
我们要做的，本质上就是三件事：

1. **把网站文件放到网上一个叫 GitHub 的地方**（相当于网盘）  
2. **去 Vercel 注册一个账号，告诉它"请帮我托管 GitHub 上的这个项目"**  
3. **Vercel 会给你一个网址，全世界都能访问**

整条流程完全免费。GitHub 和 Vercel 对个人博客都提供永久免费额度。

---

## 1. 你需要准备的东西

| 项目 | 要求 | 说明 |
|------|------|------|
| 一个**邮箱** | QQ / 网易 / Gmail 都行 | 用于注册 GitHub 和 Vercel |
| 一个**浏览器** | Chrome / Edge / Safari 都行 | 推荐 Chrome |
| **10-15 分钟** | 第一次比较慢 | 之后修改内容只需要 1 分钟 |
| 我们的网站文件 | `my-one-person-company/` 文件夹 | 之前帮你做好的那个 |

> 不需要：信用卡、不需要服务器、不需要装任何软件、不需要懂代码。

---

## 2. 五个步骤，从 0 到上线

### Step 1：注册 GitHub 账号（如果你已经有了，跳到 Step 2）

1. 打开浏览器，访问：**https://github.com**
2. 右上角点 **"Sign up"**（注册）
3. 按提示填：
   - 邮箱（建议用 QQ 邮箱，方便）
   - 密码
   - 用户名（这就是你的 GitHub ID，建议用英文，比如 `monna-geng`）
4. 验证邮箱：GitHub 会发一封邮件到你的邮箱，点邮件里的验证链接
5. 选择计划时，**选 Free（免费）**，点 **"Continue"**
6. 完成！回到 https://github.com 看到自己的头像就成功了

> 💡 **小贴士**：用户名会出现在你的 Vercel 网址里，比如 `monna-geng.vercel.app`。  
> 取一个你喜欢的英文 ID，以后改起来比较麻烦。

---

### Step 2：在 GitHub 上创建一个"仓库"放网站文件

1. 登录 GitHub 后，右上角有一个 **"+"** 按钮 → 点 **"New repository"**
2. 填表：
   - **Repository name（仓库名）**：`one-person-company`（**改成这个**，后面要照着用）
   - **Description（描述）**：可填可空，比如 "我的个人博客"
   - **Public / Private**：选 **Public**（公开），这样 Vercel 免费部署更简单
   - **Add a README file**：✅ 勾上
   - **Add .gitignore** 和 **Add license**：都不用勾
3. 点页面下方绿色的 **"Create repository"** 按钮

> 💡 看到新页面顶部有一行地址像 `https://github.com/你的用户名/one-person-company`，记一下这个。

---

### Step 3：把网站文件全部上传到 GitHub（关键步骤）

**这是最关键的一步。** 我们要把之前做好的所有文件（HTML、CSS、JS、文章）放到 GitHub 上。

#### 3.1 在 GitHub 仓库页面，点击上传链接

- 在仓库页面上方找到一行小字：
  > "or **uploading an existing file**"  
  > （或上传一个已存在的文件）
- 点这个链接

#### 3.2 把文件夹里的所有内容拖到上传区

回到你电脑上的项目文件夹：

```
D:\数字大脑\04_Output\Workbuddy输出\2026-09-10-09-42-16\my-one-person-company\
```

需要上传的**所有文件和子文件夹**（**包括** articles/、css/、js/ 三个子目录）：

| 文件 / 文件夹 | 说明 |
|------|------|
| `index.html` | 首页 |
| `services.html` | 产品服务 |
| `about.html` | 关于我 |
| `articles.html` | 文章列表 |
| `article.html` | 文章详情 |
| `booking.html` | 预约 |
| `css/` 文件夹 | 样式 |
| `js/` 文件夹 | 交互 |
| `articles/` 文件夹 | 6 篇 Markdown 文章 |

**操作方法**：

1. 打开这个文件夹（用文件资源管理器）
2. **进入文件夹内部**（双击进入 `my-one-person-company`），看到 `index.html`、`css/` 等
3. **全选**里面的**所有**文件和文件夹（Ctrl + A）
4. **拖到** GitHub 上传区

> ⚠️ **注意**：要拖的是 `my-one-person-company` 里面的内容，**不是** `my-one-person-company` 这个文件夹本身。  
> 也就是说，拖完之后 GitHub 列表里应该直接看到 `index.html`、`css`、`js`、`articles` —— 不是看到一个 `my-one-person-company` 文件夹。

#### 3.3 提交上传

- 拖完之后，往下滚到 **"Commit changes"** 区域
- 第一行写：**"上传初始网站内容"**（这就是一个备注，随便写）
- 点绿色按钮 **"Commit changes"**
- 等 5-10 秒，文件全部出现在 GitHub 页面

> ✅ 验证：现在打开 https://github.com/你的用户名/one-person-company，应该能看到 `index.html`、`css/`、`js/`、`articles/` 都在。

---

### Step 4：注册 Vercel 并部署

1. 打开新标签页，访问：**https://vercel.com**
2. 右上角 **"Sign Up"**（注册）
3. **关键**：选 **"Continue with GitHub"**（用 GitHub 登录）
4. 会跳到 GitHub 授权页，让你"授权 Vercel 访问你的 GitHub"
5. **建议选 "All repositories"**（所有仓库），这样以后你新项目也能部署  
   （或者只选 `one-person-company` 也行）
6. 跳回 Vercel，问你什么计划 —— **选 Hobby（个人项目，免费）**
7. 进入 Vercel 主页

**现在部署项目**：

1. 点 **"Add New..."** → **"Project"**
2. 在"Import Git Repository"列表里找到你的 **`one-person-company`**
3. 右边有个 **"Import"** 按钮，点它
4. 看到 "Configure Project" 页面：
   - Project Name：`one-person-company`（保持默认）
   - Framework Preset：选 **"Other"**（其他）
   - 其他都不用改
5. 点蓝色 **"Deploy"** 按钮
6. 等 30-60 秒
7. 看到 **🎉 撒花动画 + "Congratulations!"** —— 部署成功！

---

### Step 5：拿到你的网址

部署成功后，Vercel 会给你一个网址：

```
https://one-person-company-你的用户名.vercel.app
```

点进去，你应该能看到自己的网站。

> 🎉 **恭喜！你的网站正式上线了，任何人现在都能访问。**

---

## 3. 之后怎么修改内容

部署上线后，最爽的事是这个：

> **你以后在 GitHub 网页上直接改文件，Vercel 会自动重新部署。**

具体操作：

1. 打开你的 GitHub 仓库：https://github.com/你的用户名/one-person-company
2. 点你要改的文件（比如 `articles/post-1.md`）
3. 右上角铅笔 ✏️ 图标 → 编辑
4. 改完之后滚到下面，填一句备注 → 点 **"Commit changes"**
5. 等 1-2 分钟，Vercel 自动部署完成
6. 刷新你的网站网址，就能看到新内容

**完全不需要碰任何命令行 / 软件。**

---

## 4. 进阶（之后想做再回来）

| 想做什么 | 在哪里操作 |
|---------|-----------|
| 改成自己的域名（如 `monna.com`） | Vercel → Project → Settings → Domains |
| 修改网站配色 / 文字 | GitHub → 编辑 `css/style.css` 或 `index.html` |
| 加一篇新文章 | GitHub → `articles/` 文件夹 → Add file |
| 看访问量 | Vercel → Project → Analytics（需升级计划） |
| 改网站名字 | Vercel → Project → Settings → Project Name |

---

## 5. 常见问题（FAQ）

**Q1：我没有国外邮箱，用 QQ 邮箱可以吗？**  
✅ 可以。GitHub 和 Vercel 都支持 QQ 邮箱。

**Q2：Vercel 真的永久免费吗？会不会突然收费？**  
✅ Hobby 计划对个人项目永久免费。每月 100GB 流量，个人博客绰绰有余。

**Q3：我看到"信用卡"选项，要填吗？**  
❌ 不需要。Hobby 计划**不要求**信用卡。  

**Q4：上传到 GitHub 时报错了怎么办？**  
常见原因：文件太大 / 网络断了一下。删掉后重传即可。

**Q5：Vercel 部署失败了（看到红色）怎么办？**  
通常是因为仓库里没有 `index.html`（在根目录）。检查 Step 3 是不是把文件传对位置了。

**Q6：我可以把仓库设为 Private（私有）吗？**  
可以，但需要 Vercel Pro 计划。Public 对个人博客来说更省心。

**Q7：以后我把网站弄坏了怎么办？**  
GitHub 天然有版本历史。点仓库页面的 `Commits` 历史，可以回滚到任何历史版本。

---

## 6. 一句话总结

> **5 步：注册 GitHub → 建仓库 → 拖文件上传 → Vercel 登录 GitHub → 点 Deploy。**  
> **之后改内容：GitHub 网页改文件 → 自动重新部署。**

就这么简单 💪