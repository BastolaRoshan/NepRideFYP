# NepRide - Premium Vehicle Rental System

## Vendor Dashboard

A modern, premium dark-themed vendor dashboard built with React, TailwindCSS, and Vite.

### Features

✅ **Premium Dark Theme**
- Full black background (#0f0f0f)
- Gold accent color (#d4af37)
- Clean, minimal, luxurious design
- Smooth transitions and hover effects

✅ **Core Functionality**
- Vehicle management (Add, Edit, Delete)
- Booking request management
- Real-time data fetching from backend
- Protected routes (Vendor only access)
- Responsive layout

✅ **UI Components**
- Top navigation bar with logo and logout
- Tab switching between Vehicles and Bookings
- Vehicle cards with images and details
- Empty states with helpful messages
- Reusable Button component

### Technology Stack

- **React 19.2.0** - UI Framework
- **React Router DOM 7.12.0** - Routing
- **Tailwind CSS 3.x** - Styling
- **Vite 7.2.4** - Build tool
- **Lucide React** - Icons

### Installation

1. **Install dependencies:**
```bash
cd frontend/vite-project
npm install
```

2. **Run development server:**
```bash
npm run dev
```

3. **Access the dashboard:**
```
http://localhost:5174/vendor-dashboard
```

### Project Structure

```
frontend/vite-project/
├── src/
│   ├── components/
│   │   ├── Home.jsx             # Landing page
│   │   ├── Login.jsx            # Login page
│   │   ├── SignUp.jsx           # Signup page
│   │   └── ProtectedRoute.jsx   # Route protection
│   ├── pages/
│   │   ├── VendorDashboard.jsx  # 🌟 Premium Vendor Dashboard
│   │   └── CustomerDashboard.jsx
│   ├── styles/
│   │   ├── Auth.css
│   │   └── Home.css
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles + Tailwind
├── tailwind.config.js           # Tailwind configuration
├── postcss.config.js            # PostCSS configuration
└── package.json
```

### Tailwind Configuration

The dashboard uses custom Tailwind configuration with gold color variants:

```javascript
theme: {
  extend: {
    colors: {
      gold: {
        DEFAULT: '#d4af37',
        light: '#e6c758',
        dark: '#b8941f',
      },
    },
  },
}
```

### Usage

#### Vendor Dashboard Routes

```jsx
// Protected vendor-only route
<Route
  path="/vendor-dashboard"
  element={
    <ProtectedRoute allowedRoles={['Vendor', 'Admin']}>
      <VendorDashboard />
    </ProtectedRoute>
  }
/>
```

### API Integration

The dashboard connects to these backend endpoints:

- `GET /api/vehicles/vendor` - Fetch vendor's vehicles
- `POST /api/auth/logout` - Logout user
- `POST /api/vehicles` - Add new vehicle (coming soon)
- `PUT /api/vehicles/:id` - Update vehicle (coming soon)
- `DELETE /api/vehicles/:id` - Delete vehicle (coming soon)

### Design Specifications

#### Colors
- Background: `#0f0f0f`
- Secondary Background: `#000000`
- Gold Primary: `#d4af37`
- Gold Light: `#e6c758`
- Text: `#ffffff`
- Text Secondary: `#a0a0a0`
- Borders: `#1f1f1f`, `#333333`

#### Typography
- Font Family: Inter, Outfit, sans-serif
- Headings: Bold, 600-700 weight
- Body: Regular, 400 weight

#### Spacing
- Section padding: 2rem (32px)
- Card padding: 1.5rem (24px)
- Gap between elements: 1rem (16px)
- Border radius: 8px-12px

### Features Coming Soon

🔜 Add Vehicle Modal
🔜 Edit Vehicle Functionality
🔜 Delete Vehicle Confirmation
🔜 Booking Request Management
🔜 Real-time Notifications
🔜 Vehicle Statistics Dashboard
🔜 Revenue Analytics

### Testing

To test the Vendor Dashboard:

1. **Start backend server:**
```bash
cd backend
node index.js
```

2. **Start frontend:**
```bash
cd frontend/vite-project
npm run dev
```

3. **Login as vendor:**
- Navigate to `/login`
- Use vendor credentials
- Access `/vendor-dashboard`

### Responsive Design

The dashboard is fully responsive with breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

**Built with ❤️ for NepRide**
