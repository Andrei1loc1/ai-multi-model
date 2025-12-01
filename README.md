# AI Multi-Model Chat Application

A sophisticated web application built with Next.js that provides a unified interface for interacting with multiple AI language models. Leveraging OpenRouter's API, the app enables seamless conversations with various AI models like Grok, Llama, Gemma, Gemini, and DeepSeek, all within a single, intuitive platform designed for productivity, research, and learning.

## 🎯 Purpose & Vision

This application serves as a centralized hub for AI-powered conversations, eliminating the need to switch between different AI platforms. It's designed for:
- **Researchers** and **students** comparing AI model responses
- **Developers** testing and prototyping with multiple models
- **Professionals** using AI for content creation, analysis, and decision-making
- **Educators** and **learners** organizing AI-generated insights into structured notes

## 🚀 Key Features

### Core Functionality
- **Multi-Model AI Chat**: Access over 10+ AI models through OpenRouter, including Grok-4.1, Llama-3-8B, Gemma-3-27B, Gemini-2.0, and DeepSeek variants
- **Intelligent Model Selection**: Choose specific models or use "auto" mode for optimal selection
- **Real-time Streaming**: Experience live response generation with streaming support for immediate feedback
- **Markdown Rendering**: Rich text display with syntax highlighting and formatting for code, math, and structured content

### Prompt Engineering
- **Pre-built Prompt Templates**:
  - **Instant**: Quick, concise responses
  - **Detailed**: Comprehensive, structured answers with examples
  - **Human**: Natural, conversational tone
  - **Math**: Specialized for mathematical queries with LaTeX support
  - **Teoretic**: Academic and theoretical explanations
- **Context-Aware Responses**: Prompts adapt based on conversation history and user intent

### Knowledge Management
- **Note System**: Save and organize AI responses as structured markdown notes
- **Response Compression**: Condense lengthy outputs for better readability
- **Firebase Integration**: Cloud-based storage for notes and API keys with real-time synchronization

### Advanced Capabilities
- **API Key Management**: Generate and manage secure API keys for external integrations
- **Error Handling & Redundancy**: Automatic fallback across multiple API keys for uninterrupted service
- **Responsive Design**: Optimized for desktop and mobile devices with modern UI/UX

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router for optimal performance
- **TypeScript**: Type-safe development with enhanced developer experience
- **Tailwind CSS**: Utility-first styling with custom gradients and animations

### Backend & APIs
- **Next.js API Routes**: Serverless functions for AI interactions and data management
- **OpenRouter API**: Unified access to multiple AI model providers
- **Firebase Realtime Database**: NoSQL database for notes and API key storage

### Development Tools
- **ESLint**: Code quality and consistency
- **PostCSS**: CSS processing and optimization
- **Vercel**: Deployment platform with edge computing capabilities

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Realtime Database enabled
- OpenRouter API keys (multiple recommended for redundancy)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-multi-model
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create `.env.local` in the root directory:
   ```env
   # OpenRouter API Keys (multiple for redundancy)
   OPENROUTER_API_KEY_1=your_primary_key
   OPENROUTER_API_KEY_2=your_backup_key_1
   OPENROUTER_API_KEY_3=your_backup_key_2
   OPENROUTER_API_KEY_4=your_backup_key_3
   OPENROUTER_API_KEY_5=your_backup_key_4

   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id

   # Optional: Vercel deployment
   VERCEL_URL=https://your-app.vercel.app
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Usage Guide

### Getting Started
1. **Landing Page**: Choose between opening the chat interface or generating an API key
2. **Model Selection**: Use the dropdown to select your preferred AI model or "auto" for intelligent selection
3. **Prompt Selection**: Choose from pre-built prompt templates or customize as needed

### Chat Workflow
1. **Compose Message**: Type your query in the input field
2. **Send & Stream**: Press Enter or click Send to initiate real-time response generation
3. **View Response**: Responses render in markdown with syntax highlighting
4. **Save Insights**: Use the save functionality to store valuable responses as notes

### Note Management
- **Access Notes**: Navigate to the notes page to view saved responses
- **Add Notes**: Create new notes manually or save from chat responses
- **Organize**: Notes are stored in Firebase with real-time updates across devices

### API Integration
- **Generate Keys**: Use the API key generator for external integrations
- **External Access**: Use `/api/v1/chat` endpoint with Bearer token authentication
- **Rate Limiting**: Built-in retry logic and error handling for robust API usage

## 🏗️ Architecture Overview

```
ai-multi-model/
├── app/                          # Next.js App Router
│   ├── api/                      # API endpoints
│   │   ├── ai/route.ts           # Main AI interaction (POST/GET, streaming)
│   │   ├── v1/chat/route.ts      # Authenticated chat API
│   │   ├── compress/route.ts     # Response compression
│   │   └── generate-key/route.ts # API key generation
│   ├── chat/                     # Main chat interface
│   │   ├── page.tsx              # Chat page
│   │   └── ChatUI.tsx            # Chat component orchestration
│   ├── components/               # Reusable UI components
│   │   ├── Chat/                 # Chat-specific components
│   │   │   ├── ChatInput.tsx     # Message input with selectors
│   │   │   ├── ChatWindow.tsx    # Response display
│   │   │   ├── ModelSelector.tsx # AI model dropdown
│   │   │   └── PromptSelector.tsx# Prompt template selector
│   │   ├── MarkDown/             # Markdown rendering
│   │   ├── modals/               # Dialog components
│   │   ├── Navigation/           # App navigation
│   │   └── notes/                # Note management components
│   ├── lib/                      # Business logic & utilities
│   │   ├── AImodels/models.ts    # AI model configurations
│   │   ├── chatUtils/            # Chat processing utilities
│   │   │   ├── aiRequest.ts      # OpenRouter API client
│   │   │   ├── sendMessage.ts    # Message sending logic
│   │   │   └── getModel.ts       # Model selection logic
│   │   ├── constants/            # App constants
│   │   ├── database/firebase.ts  # Firebase configuration
│   │   └── prompts/              # Prompt template definitions
│   ├── notes/page.tsx            # Notes management page
│   └── generateAPI/page.tsx      # API key generation page
├── public/                       # Static assets
├── styles/                       # Global stylesheets
└── package.json                  # Project dependencies
```

## 🔧 API Endpoints

### Internal Endpoints
- `POST /api/ai` - Send messages to AI models (supports streaming)
- `GET /api/ai` - Alternative GET method for AI requests

### External API
- `POST /api/v1/chat` - Authenticated chat endpoint for external integrations
  - Requires: `Authorization: Bearer <api-key>`
  - Body: `{ "prompt": "your message", "model": "optional-model-id" }`

### Utility Endpoints
- `/api/compress` - Compress long AI responses
- `/api/generate-key` - Generate new API keys for external use

## 🔧 Development Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint checks
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** changes: `git commit -m 'Add your feature description'`
4. **Push** to branch: `git push origin feature/your-feature-name`
5. **Open** a Pull Request with detailed description

### Development Guidelines
- Follow TypeScript best practices
- Maintain consistent code style with ESLint
- Add tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for full terms.

## 📞 Support & Community

- **Issues**: Report bugs or request features on GitHub Issues
- **Discussions**: Join community discussions for questions and ideas
- **Documentation**: Check inline code comments and this README for technical details

## 🙏 Acknowledgments

- **OpenRouter** for providing unified AI model access
- **Vercel** for hosting and deployment infrastructure
- **Firebase** for reliable database services
- **Next.js** team for the excellent React framework

---

**Built with ❤️ for the AI-powered future**
