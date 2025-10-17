# CollabCanvas Demo Script

## Pre-Demo Setup (5 minutes)

### 1. Browser Windows Preparation
- **Window 1**: Chrome - User "Alice" 
- **Window 2**: Firefox - User "Bob"
- **Window 3**: Safari - User "Carol" (optional)
- Position windows side-by-side for easy viewing

### 2. Test Accounts Ready
- **Option A**: Use Google sign-in with different Google accounts
- **Option B**: Create test accounts with email/password:
  - alice@example.com / password123
  - bob@example.com / password123  
  - carol@example.com / password123

## Demo Flow (8-10 minutes)

### Part 1: Authentication & First Impressions (2 minutes)
1. **Open CollabCanvas** in Window 1
   - Show clean, modern UI with floating panels
   - Demonstrate theme toggle (dark/light)
   - Sign in as "Alice" with Google or email

2. **Show Initial Canvas State**
   - Point out 5000x5000px canvas size
   - Demonstrate pan with mouse drag
   - Demonstrate zoom with mouse wheel
   - Show canvas info panel (zoom level, position, shape count)

### Part 2: Single User Shape Creation (2 minutes)
3. **Create Shapes**
   - Click "Draw" mode in toolbar
   - Draw 2-3 rectangles by dragging
   - Show drawing preview while dragging
   - Switch to "Move" mode
   - Select and move shapes around
   - Demonstrate boundary enforcement (shapes can't leave 5000x5000 area)

4. **Shape Operations**
   - Select shape to show selection border
   - Delete shape with Delete key
   - Click empty canvas to deselect
   - Show keyboard shortcuts (D for draw, V for move, R for reset view)

### Part 3: Real-Time Collaboration Magic (4 minutes)
5. **Introduce Second User**
   - Open Window 2, sign in as "Bob"
   - **Key moment**: Show Bob's presence indicator appear in Alice's window
   - Show cursor tracking - Bob's cursor appears with name label in Alice's window
   - Different colored cursor for each user

6. **Simultaneous Shape Creation**
   - Bob creates shapes while Alice watches
   - **Emphasize**: Shapes appear instantly in Alice's window
   - Alice creates shapes while Bob watches
   - Show real-time sync is bidirectional

7. **Object Locking Demo**
   - Alice starts dragging a shape
   - **Critical demo**: Bob tries to drag the same shape - it's locked!
   - Show visual feedback (locked shape has different appearance)
   - Alice releases shape - Bob can now move it
   - Demonstrate "first-come-first-serve" locking system

### Part 4: Advanced Collaboration Features (2 minutes)
8. **Multi-User Interactions**
   - Both users create and move shapes simultaneously
   - Show smooth performance with multiple shapes
   - Demonstrate cursor tracking precision
   - Show presence awareness - user count updates

9. **Persistence & Reliability**
   - Bob refreshes browser - all shapes remain
   - Alice's changes still sync to refreshed Bob window
   - Show error handling - disconnect one user, reconnect
   - Demonstrate offline/online transitions

## Key Talking Points

### Technical Highlights
- **"Under 100ms sync time"** - Shape changes appear almost instantly
- **"First-come-first-serve locking"** - Prevents editing conflicts elegantly  
- **"5000x5000 pixel canvas"** - Large workspace for complex designs
- **"Real-time cursor tracking"** - See exactly where teammates are working
- **"Automatic presence management"** - Know who's online and active

### Architecture Strengths
- **Firebase backend** - Scalable, reliable real-time infrastructure
- **Konva.js canvas** - High-performance 2D rendering
- **React architecture** - Modern, maintainable frontend
- **Mobile-responsive** - Works on tablets and large phones

### User Experience Features
- **Glass morphism UI** - Modern, clean design aesthetic
- **Dark mode default** - Easier on eyes for long design sessions
- **Keyboard shortcuts** - Professional workflow efficiency
- **Error boundaries** - Graceful error handling with user-friendly messages

## Backup Demo Content (If Technical Issues)

### Local Demo Option
- Run locally with `npm run dev`
- Use multiple browser tabs instead of separate browsers
- Same core functionality demonstration

### Key Metrics to Mention
- **Performance**: 60 FPS maintained with 100+ shapes
- **Scalability**: Tested with 5+ concurrent users  
- **Compatibility**: Chrome, Firefox, Safari support
- **Security**: Production-ready Firebase security rules

## Closing Points

### What This Demonstrates
- Real-time collaborative editing is achievable with modern web tech
- Firebase provides enterprise-grade real-time infrastructure
- React + Canvas libraries can create sophisticated design tools
- Proper state management enables complex multi-user interactions

### Next Steps / Extension Ideas
- Multiple shape types (circles, text, images)
- Advanced editing features (resize, rotate, styling)
- Version history and undo/redo
- Voice/video integration for team collaboration
- AI-powered design assistance

---

**Total Demo Time: 8-10 minutes**  
**Setup Time: 5 minutes**  
**Questions & Discussion: 5-10 minutes**
