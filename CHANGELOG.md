# Changelog - Open Pet Platform

All notable changes to this project will be documented in this file.

---

## [Unreleased] - 2026-02-06

### Added
- **Swipe Mode**: Tinder-style swipe interface for browsing pets
  - Left swipe to pass, right swipe to like
  - AI learning engine tracks preferences
  - Filter panel with species, size, energy level, and compatibility filters
  - Smart empty states based on filter status
  - "You've seen them all!" celebration when finished swiping
  
- **Match Wizard**: Preference-based pet matching system
  - User profile creation with pet preferences
  - Redirects to swipe mode with applied filters
  
- **Pet Profile Pages**: Detailed individual pet views
  - Full photo gallery
  - Complete pet information
  - Share functionality (social media, email, copy link)
  - Adoption application modal
  
- **Shortlist Feature**: Save favorite pets for later
  - Heart button to add/remove pets
  - Dedicated shortlist page
  - Empty state with CTA to browse pets
  
- **Pet Explorer**: Grid view with tabbed navigation
  - "All Pets" tab with filter options
  - "Recommended" tab with AI-powered suggestions
  - Filter by species, size, energy level
  - Urgent/senior pet priority banners
  
- **Adoption Application System**: 
  - 3-step application form (contact, living situation, experience)
  - Application tracking page
  - Status management (pending/approved/rejected)
  - LocalStorage persistence
  
- **Share Pet Profiles**:
  - Share via Facebook, Twitter, Email
  - Copy link functionality
  - Shareable URLs for individual pets
  
- **Success Stories**: Gallery of adoption success stories
  - Before/after images
  - Heartwarming narratives
  - Social proof to encourage adoptions
  
- **AI Learning Engine**:
  - Tracks user swipe patterns
  - Learns preferences over time
  - Provides personalized recommendations
  - Calculates compatibility scores
  
- **Data Adapters**:
  - Mock adapter for development/demo
  - Buffalo (Montgomery County) adapter with live API integration
  - Shelterluv adapter with AI enrichment
  - Extensible pattern for adding more shelter APIs
  
- **Navigation**:
  - Responsive navbar with mobile menu
  - Links to Swipe, Explorer, Shortlist, Success Stories, Applications
  - Pet intake form for shelters (admin)
  
- **Azure Deployment Configuration**:
  - GitHub Actions CI/CD workflow
  - Static Web Apps configuration
  - Environment variables template
  - Deployment documentation

### Fixed
- Filter logic bug where selecting "Dogs" still showed cats
- Species detection using tags array instead of dedicated field
- Size and energy level filters now handle missing data gracefully
- Optional chaining for compatibility fields to prevent errors
- Empty state now differentiates between "no matches" and "all done"

### Changed
- Standardized energy level terminology from 'Chill' to 'Low'
- Added 'Medium' size option across all interfaces
- Added 'Other' species category for non-dog/cat animals
- Match wizard now redirects to swipe mode instead of separate page
- Updated homepage CTA from "Find My Match" to "Start Swiping"

### Technical
- Next.js 16.0.7 with App Router
- React 19.2.0
- TypeScript 5
- Tailwind CSS 4
- Framer Motion for animations
- Lucide React for icons
- LocalStorage for client-side persistence
- Repository pattern for data source abstraction

---

## [0.1.0] - Initial Setup

### Added
- Basic Next.js project structure
- Tailwind CSS configuration
- TypeScript setup
- ESLint configuration

---

## Deployment History

### 2026-02-06 - Preparing for Azure App Service Deployment
- Created GitHub Actions workflow for Azure App Service (not Static Web Apps)
- Updated deployment documentation for full Next.js support
- Configured next.config.ts to keep ISR capabilities
- Ready for production deployment on Azure App Service Basic B1 tier
- **Why App Service**: App uses Next.js ISR (`revalidate`) and server-side data fetching

---

## Notes

- **Version**: Pre-release (0.x.x)
- **Status**: Development/Demo
- **Next Steps**: 
  - Deploy to Azure Static Web Apps
  - Set up custom domain
  - Add real shelter API integrations
  - Implement analytics tracking
  - Add user authentication (optional)
