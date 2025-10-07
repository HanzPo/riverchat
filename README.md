# 🌊 RiverChat

A non-linear chat application that visualizes conversations as branching "Rivers." Explore different conversational paths simultaneously, manage multiple AI models, and interact with chat history in an intuitive, graph-based interface.

![RiverChat - Non-linear AI Conversations](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white)

## ✨ Features

### 🌳 Non-Linear Conversations
- **Branching Dialogue**: Create multiple conversation paths from any point
- **Graph Visualization**: See your entire conversation tree at a glance using Vue Flow
- **Context-Aware**: Each branch maintains its own conversation history

### 🤖 Multi-Model Support
- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-4o Mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Google**: Gemini 2.0 Flash, Gemini Exp 1206, Gemini 1.5 Pro
- **Streaming Responses**: Real-time token streaming for all providers

### 🎨 Beautiful UI
- **Glassmorphism Design**: Frosted glass overlays with backdrop blur
- **Dark/Light Themes**: Seamlessly switch between themes
- **Responsive Layout**: Works on desktop and tablet devices
- **Smooth Animations**: Polished transitions and interactions

### 🔐 Privacy First
- **Local-First Architecture**: All data stored in browser localStorage
- **No Server Required**: API keys never leave your browser
- **Client-Side Only**: Direct communication with LLM providers

### 💡 Quality of Life
- **Keyboard Shortcuts**: Quick access to common actions
- **Context Menus**: Right-click nodes for quick actions
- **River Management**: Create, rename, and organize multiple conversations
- **Search**: Find messages across your conversation tree
- **Copy Messages**: Easy clipboard integration

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys from at least one provider (OpenAI, Anthropic, or Google)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/riverchat.git
   cd riverchat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

### Building for Production

```bash
npm run build
npm run preview
```

## 🎮 Usage

### First Time Setup

1. On first launch, you'll see the Welcome modal
2. Enter at least one API key for OpenAI, Anthropic, or Google
3. Your keys are stored securely in browser localStorage
4. Click "Get Started" to begin

### Creating Your First River

1. Click the "📂 Rivers" button in the top navigation
2. Enter a name for your conversation
3. Click "+ New River"
4. Start chatting!

### Interacting with the Graph

- **Left-Click Node**: Select and view conversation path
- **Double-Click Node**: View full message content
- **Right-Click Node**: Open context menu with actions:
  - 🌿 Branch From Here
  - 🔄 Regenerate Response (AI nodes)
  - ✏️ Edit & Resubmit (User nodes)
  - 📋 Copy Message
  - 👁️ View Full Message
  - 🗑️ Delete Branch

### Keyboard Shortcuts

- `Ctrl+K` / `Cmd+K`: Open Rivers dashboard
- `Ctrl+,` / `Cmd+,`: Open Settings
- `Ctrl+F` / `Cmd+F`: Search (coming soon)
- `Ctrl+Enter` / `Cmd+Enter`: Send message
- `Escape`: Close modals

## 🏗️ Architecture

### Project Structure

```
riverchat/
├── src/
│   ├── assets/
│   │   └── glassmorphism.css      # Theme styles
│   ├── components/
│   │   ├── ChatHistory.vue         # Linear chat view
│   │   ├── ConfirmationModal.vue   # Confirmation dialogs
│   │   ├── CustomNode.vue          # Graph node component
│   │   ├── GraphCanvas.vue         # Vue Flow canvas
│   │   ├── MessageViewerModal.vue  # Full message viewer
│   │   ├── RiverDashboard.vue      # River management
│   │   ├── SettingsModal.vue       # Settings interface
│   │   └── WelcomeModal.vue        # First-time setup
│   ├── composables/
│   │   └── useRiverChat.ts         # Main state management
│   ├── services/
│   │   ├── llm-api.ts              # LLM provider integration
│   │   └── storage.ts              # localStorage manager
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── App.vue                     # Main app component
│   ├── main.ts                     # Entry point
│   └── style.css                   # Global styles
├── package.json
└── vite.config.ts
```

### Key Technologies

- **Vue 3**: Composition API with `<script setup>`
- **TypeScript**: Full type safety
- **Vue Flow**: Graph visualization
- **Vite**: Build tool and dev server
- **localStorage**: Client-side persistence

### Data Model

```typescript
interface River {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  nodes: Record<string, MessageNode>;
  rootNodeId: string | null;
}

interface MessageNode {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
  parentId: string | null;
  state: 'complete' | 'generating' | 'error';
  model?: LLMModel;
  error?: string;
}
```

## 🔮 Future Enhancements

### Planned Features
- [ ] Advanced search with filters
- [ ] Export conversations (JSON, Markdown)
- [ ] Import conversations
- [ ] Custom node colors and tags
- [ ] Conversation statistics
- [ ] More keyboard shortcuts

### Cloud Integration Path
- [ ] User authentication (OAuth)
- [ ] Cloud storage sync (Firestore/MongoDB)
- [ ] Multi-device access
- [ ] Conversation sharing
- [ ] Collaboration features

## 🛠️ Development

### Tech Stack

- **Framework**: Vue 3.5+ with Composition API
- **Language**: TypeScript 5.9+
- **Build Tool**: Vite 7.1+
- **Graph Library**: Vue Flow
- **Styling**: Custom CSS with glassmorphism theme

### Code Style

- Functional and declarative patterns
- TypeScript strict mode
- Modular component architecture
- Descriptive variable names
- Comprehensive type definitions

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Vue Flow](https://vueflow.dev/) for the excellent graph visualization library
- [Vue.js](https://vuejs.org/) for the reactive framework
- OpenAI, Anthropic, and Google for their LLM APIs

## 📧 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

Built with ❤️ using Vue and TypeScript
