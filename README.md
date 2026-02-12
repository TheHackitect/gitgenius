<div align="center">

<!-- Animated Header Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=180&section=header&text=GitGenius&fontSize=70&fontColor=fff&animation=twinkling&fontAlignY=35&desc=Keep%20Your%20GitHub%20Green%20Every%20Single%20Day&descSize=20&descAlignY=55" width="100%"/>

<!-- Badges Row 1 -->
<p>
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
</p>

<!-- Badges Row 2 -->
<p>
  <img src="https://img.shields.io/github/stars/thehackitect/gitgenius?style=for-the-badge&logo=github&color=yellow" alt="Stars"/>
  <img src="https://img.shields.io/github/forks/thehackitect/gitgenius?style=for-the-badge&logo=github&color=blue" alt="Forks"/>
  <img src="https://img.shields.io/github/issues/thehackitect/gitgenius?style=for-the-badge&logo=github&color=red" alt="Issues"/>
  <img src="https://img.shields.io/github/license/thehackitect/gitgenius?style=for-the-badge&color=green" alt="License"/>
</p>

<!-- Typing Animation -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=22C55E&center=true&vCenter=true&random=false&width=600&lines=%F0%9F%9A%80+Automate+Your+GitHub+Contributions;%F0%9F%8E%AF+Keep+Your+Streak+Alive+Forever;%F0%9F%94%92+Secure+Multi-Account+Management;%F0%9F%93%8A+Real-Time+Analytics+Dashboard;%E2%9A%A1+Smart+Human-Like+Scheduling" alt="Typing SVG" />
</a>

<br/><br/>

<!-- Screenshot -->
<img src="docs/dashboard-preview.png" alt="GitGenius Dashboard" width="90%" style="border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);"/>

<br/><br/>

<!-- Quick Links -->
<p>
  <a href="#-features"><img src="https://img.shields.io/badge/Features-22C55E?style=for-the-badge" alt="Features"/></a>
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-3B82F6?style=for-the-badge" alt="Quick Start"/></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Tech_Stack-8B5CF6?style=for-the-badge" alt="Tech Stack"/></a>
  <a href="#-developer"><img src="https://img.shields.io/badge/Developer-F59E0B?style=for-the-badge" alt="Developer"/></a>
</p>

</div>

---

## 🌟 Why GitGenius?

<table>
<tr>
<td width="50%">

### 😫 The Problem

You're a dedicated developer, but life gets in the way:
- 📅 Busy with work or studies
- 🏖️ Taking a well-deserved vacation  
- 😴 Missing a few days breaks your streak
- 📉 Your contribution graph looks inconsistent
- 🎯 Recruiters judge your activity

</td>
<td width="50%">

### 🎉 The Solution

**GitGenius** keeps your profile alive 24/7:
- ✅ Automated commits that look natural
- ✅ Human-like scheduling patterns
- ✅ Multiple account support
- ✅ Complete control & customization
- ✅ Set it and forget it

</td>
</tr>
</table>

---

## ✨ Features

<div align="center">

| Feature | Description |
|:-------:|:-----------:|
| 🔐 **Multi-Account Management** | Connect unlimited GitHub accounts with encrypted token storage |
| 🧠 **Smart Scheduling** | AI-powered commit timing that mimics human behavior |
| 📁 **Repository Control** | Choose exactly which repos receive automated commits |
| ⏰ **Flexible Timing** | Set custom schedules with timezone support |
| 📊 **Real-Time Analytics** | Track streaks, patterns, and success rates |
| 📝 **Activity Logs** | Complete audit trail of all automation |
| 🔒 **Bank-Grade Security** | AES-256-GCM encryption for all tokens |
| 🎨 **Beautiful UI** | Modern dashboard with dark mode |

</div>

<details>
<summary><b>🎯 Commit Style Options</b></summary>

| Style | Examples |
|-------|----------|
| **Conventional** | `feat: add user authentication`, `fix: resolve login issue` |
| **Casual** | `Update project files`, `Fix small bug` |
| **Technical** | `Implement caching layer`, `Refactor authentication module` |
| **Mixed** | Random selection from all styles |

</details>

---

## 🛠️ Tech Stack

<div align="center">

```mermaid
graph TB
    subgraph Frontend
        A[Next.js 14] --> B[React 18]
        B --> C[TypeScript]
        C --> D[Tailwind CSS]
        D --> E[shadcn/ui]
    end
    
    subgraph Backend
        F[API Routes] --> G[Prisma ORM]
        G --> H[PostgreSQL]
    end
    
    subgraph Queue
        I[BullMQ] --> J[Redis]
        J --> K[Worker Process]
    end
    
    subgraph Security
        L[NextAuth.js] --> M[AES-256-GCM]
        M --> N[bcrypt]
    end
    
    E --> F
    K --> O[GitHub API]
```

</div>

<div align="center">
<table>
<tr>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
  <br>Next.js
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
  <br>React
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
  <br>TypeScript
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
  <br>Tailwind
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=postgresql" width="48" height="48" alt="PostgreSQL" />
  <br>PostgreSQL
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=redis" width="48" height="48" alt="Redis" />
  <br>Redis
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=prisma" width="48" height="48" alt="Prisma" />
  <br>Prisma
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=docker" width="48" height="48" alt="Docker" />
  <br>Docker
</td>
</tr>
</table>
</div>

---

## 🚀 Quick Start

### Prerequisites

<div align="center">

| Requirement | Version |
|:-----------:|:-------:|
| ![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white) | 20+ |
| ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat-square&logo=postgresql&logoColor=white) | 14+ |
| ![Redis](https://img.shields.io/badge/Redis-6+-DC382D?style=flat-square&logo=redis&logoColor=white) | 6+ |

</div>

### Installation

```bash
# 📥 Clone the repository
git clone https://github.com/thehackitect/gitgenius.git
cd gitgenius

# 📦 Install dependencies
npm install

# ⚙️ Configure environment
cp .env.example .env
# Edit .env with your values

# 🗄️ Setup database
npx prisma generate
npx prisma migrate dev

# 🚀 Start development
npm run dev        # Start web app
npm run worker     # Start automation worker (separate terminal)
```

<details>
<summary><b>📋 Environment Variables</b></summary>

```env
# 🗄️ Database
DATABASE_URL="postgresql://user:password@localhost:5432/gitgenius"

# 🔴 Redis  
REDIS_URL="redis://localhost:6379"

# 🔐 NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"  # openssl rand -base64 32

# 🔒 Encryption (for GitHub tokens)
ENCRYPTION_KEY="your-64-char-hex-key"  # openssl rand -hex 32

# 🐙 GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

</details>

---

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

<details>
<summary><b>📄 docker-compose.yml</b></summary>

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/gitgenius
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  worker:
    build: .
    command: npm run worker
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/gitgenius
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=gitgenius

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

</details>

---

## 🔑 GitHub OAuth Setup

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Go to GitHub → Settings → Developer Settings → OAuth Apps  │
│  2. Click "New OAuth App"                                       │
│  3. Fill in the details:                                        │
│     • Application name: GitGenius                               │
│     • Homepage URL: http://YOUR_IP:3000                         │
│     • Callback URL: http://YOUR_IP:3000/api/auth/callback/github│
│  4. Copy Client ID and Secret to .env                           │
└─────────────────────────────────────────────────────────────────┘
```

</div>

> 💡 **Tip:** Domain name is NOT required! Use your IP address directly.

---

## 📊 Architecture

<div align="center">

```
┌──────────────────────────────────────────────────────────────────────┐
│                          🌐 GITGENIUS ARCHITECTURE                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│   │   Browser   │───▶│  Next.js    │───▶│ PostgreSQL  │             │
│   │   Client    │    │   Server    │    │  Database   │             │
│   └─────────────┘    └──────┬──────┘    └─────────────┘             │
│                             │                                        │
│                             ▼                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│   │   GitHub    │◀───│   Worker    │◀───│   BullMQ    │             │
│   │    API      │    │  Process    │    │   + Redis   │             │
│   └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

</div>

---

## 🔒 Security

<div align="center">

| Feature | Implementation |
|:-------:|:--------------:|
| 🔐 Token Encryption | AES-256-GCM |
| 🍪 Session Security | HTTP-only Secure Cookies |
| 🚦 Rate Limiting | API & Auth Endpoints |
| ✅ Input Validation | Zod Schema Validation |
| 🔒 HTTPS | Required in Production |
| 🛡️ Password Hashing | bcrypt (12 rounds) |

</div>

---

## 👨‍💻 Developer

<div align="center">

<img src="https://github.com/thehackitect.png" width="150" style="border-radius: 50%;"/>

### **The Hackitect**

*Full-Stack Developer & Security Enthusiast*

<br/>

<!-- Social Badges -->
<p>
  <a href="https://github.com/thehackitect">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
  <a href="https://instagram.com/thehackitect.me">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"/>
  </a>
  <a href="https://linkedin.com/in/thehackitect">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
  </a>
</p>

<p>
  <a href="https://twitter.com/thehackitect">
    <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter"/>
  </a>
  <a href="https://t.me/thehackitect">
    <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"/>
  </a>
  <a href="https://youtube.com/@thehackitect">
    <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube"/>
  </a>
</p>

<br/>

**💬 Got questions? Reach out!**

</div>

---

## 🤝 Contributing

<div align="center">

Contributions are **welcome**! Here's how:

</div>

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Commit your changes
git commit -m 'feat: add amazing feature'

# 4. Push to the branch
git push origin feature/amazing-feature

# 5. Open a Pull Request
```

---

## 📄 License

<div align="center">

This project is licensed under the **MIT License**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## ⚠️ Disclaimer

<div align="center">

> This tool is for **educational purposes**. Use responsibly and in accordance with GitHub's Terms of Service.
> Automated commits should add genuine value to your projects.

</div>

---

<div align="center">

<!-- Activity Graph -->
<img src="https://github-readme-activity-graph.vercel.app/graph?username=thehackitect&theme=github-compact&hide_border=true&area=true&custom_title=GitGenius%20Development%20Activity" width="100%"/>

<br/>

<!-- Footer -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer" width="100%"/>

**Built with 💚 by [The Hackitect](https://github.com/thehackitect)**

*Making GitHub green, one commit at a time* 🌱

</div>
