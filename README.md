# Ready9ja Marketplace

A comprehensive e-commerce marketplace built with React Native (Expo), Firebase, and TypeScript. This marketplace connects buyers and sellers with real-time chat, order management, payment processing, and logistics integration.

## 🚀 Features

### Core Features
- **Multi-role Authentication**: Buyers, Sellers, and Admins with role-based access
- **Product Management**: Full CRUD operations for products with image upload
- **Real-time Chat**: Direct messaging between buyers and sellers
- **Order Management**: Complete order lifecycle from creation to delivery
- **Payment Integration**: Paystack/Flutterwave integration for secure payments
- **Referral System**: User referral program with bonuses
- **Review & Rating**: Product and seller rating system
- **Search & Filter**: Advanced product search and filtering
- **Favorites**: Wishlist functionality for buyers
- **Admin Dashboard**: Comprehensive admin panel for system management

### Technical Features
- **Cross-platform**: Web, iOS, and Android support
- **Real-time Updates**: Firebase real-time subscriptions
- **Offline Support**: Local data caching
- **Push Notifications**: Firebase Cloud Messaging
- **Image Management**: Automatic image compression and upload
- **Security**: Row-level security with Firestore rules
- **Performance**: Optimized queries and pagination

## 🏗️ Architecture

### Frontend
- **React Native with Expo**: Cross-platform development
- **TypeScript**: Type-safe development
- **React Navigation**: Navigation management
- **React Hook Form**: Form handling with validation
- **TanStack Query**: Server state management
- **AsyncStorage**: Local data persistence

### Backend
- **Firebase Authentication**: User management
- **Firestore**: NoSQL database with real-time updates
- **Firebase Storage**: File and image storage
- **Firebase Cloud Functions**: Server-side logic (optional)
- **Firebase Cloud Messaging**: Push notifications

### State Management
- **React Context**: Authentication and global state
- **TanStack Query**: Server state and caching
- **React Hooks**: Local component state

## 📁 Project Structure

```
Ready9jaMarketplace/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Generic components
│   │   ├── auth/            # Authentication components
│   │   ├── product/         # Product-related components
│   │   ├── order/           # Order management components
│   │   ├── chat/            # Chat components
│   │   └── admin/           # Admin components
│   ├── screens/             # Screen components
│   │   ├── auth/            # Authentication screens
│   │   ├── buyer/           # Buyer-specific screens
│   │   ├── seller/          # Seller-specific screens
│   │   ├── admin/           # Admin screens
│   │   └── common/          # Shared screens
│   ├── services/            # External service integrations
│   │   ├── firebase/        # Firebase services
│   │   ├── api/             # API clients
│   │   ├── payment/         # Payment integrations
│   │   └── notification/    # Push notification service
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── navigation/          # Navigation configuration
│   ├── constants/           # App constants
│   └── assets/              # Static assets
├── firebase/                # Firebase configuration
│   ├── firestore.rules      # Firestore security rules
│   └── firestore.indexes.json # Database indexes
├── App.tsx                  # Root component
└── package.json            # Dependencies and scripts
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ready9jaMarketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication, Firestore, and Storage
   - Update `src/services/firebase/config.ts` with your Firebase configuration
   - Deploy Firestore rules and indexes:
     ```bash
     firebase deploy --only firestore:rules
     firebase deploy --only firestore:indexes
     ```

4. **Environment Configuration**
   - Add your Firebase configuration to `src/services/firebase/config.ts`
   - Configure payment gateway keys (Paystack/Flutterwave)

5. **Run the application**
   ```bash
   # Web development
   npm run web
   
   # iOS development
   npm run ios
   
   # Android development
   npm run android
   ```

## 🔐 Firebase Security

### Firestore Rules
The application uses comprehensive security rules that:
- Ensure users can only access their own data
- Implement role-based access control
- Protect sensitive operations (admin-only)
- Validate data structure and required fields

### Storage Rules
- Users can only upload to their designated folders
- Public read access for product images and avatars
- Admin-controlled uploads for system assets

## 📱 User Roles & Permissions

### Buyer
- Browse marketplace
- Search and filter products
- Chat with sellers
- Place and track orders
- Leave reviews
- Manage favorites
- Refer friends

### Seller
- Manage product inventory
- Handle customer inquiries
- Process orders
- View analytics
- Chat with buyers
- Refer friends

### Admin
- Manage all users and orders
- View system analytics
- Handle disputes
- Manage riders/logistics
- System configuration

## 🔧 Development Scripts

```bash
# Start development server
npm run web          # Web development
npm run ios          # iOS development
npm run android      # Android development

# Build for production
npm run build

# Run tests
npm test

# Deploy Firebase rules
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## 📚 Key Dependencies

### Core
- `react-native` - Mobile development framework
- `expo` - Development platform
- `typescript` - Type safety
- `firebase` - Backend services

### Navigation
- `@react-navigation/native` - Navigation library
- `@react-navigation/stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

### Forms & Validation
- `react-hook-form` - Form handling
- `@hookform/resolvers` - Form validation
- `yup` - Schema validation

### State Management
- `@tanstack/react-query` - Server state management
- `@react-native-async-storage/async-storage` - Local storage

### UI Components
- `react-native-elements` - UI components
- `react-native-vector-icons` - Icons
- `expo-linear-gradient` - Gradients

### Payment
- `react-native-paystack-webview` - Paystack integration

### Chat
- `react-native-gifted-chat` - Chat interface

## 🚀 Deployment

### Web Deployment
1. Build the web version: `npm run build:web`
2. Deploy to your preferred hosting (Vercel, Netlify, etc.)

### Mobile App Deployment
1. Build APK/IPA using Expo build service
2. Submit to Google Play Store and Apple App Store

### Firebase Deployment
1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Deploy indexes: `firebase deploy --only firestore:indexes`
3. Deploy Cloud Functions (if any): `firebase deploy --only functions`

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Configuration Error**
   - Ensure all Firebase services are enabled
   - Check API keys and configuration

2. **Navigation Issues**
   - Clear Metro cache: `npx expo start --clear`
   - Restart development server

3. **Build Errors**
   - Update Expo CLI: `npm install -g @expo/cli`
   - Clear node_modules and reinstall

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please reach out to the development team or create an issue in the repository.

---

**Ready9ja Marketplace** - Connecting buyers and sellers across Nigeria 🇳🇬
