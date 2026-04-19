import swaggerJsdoc from 'swagger-jsdoc';
import config from './index.js';

const isProd = config.env === 'production';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Immobilier.ch API',
      version: '1.0.0',
      description: `
## Swiss Real-Estate Platform API

Production-grade REST API powering the Immobilier.ch platform — a multilingual Swiss real-estate marketplace.

### Demo Credentials

All demo accounts use password: **\`Password123!\`**

| Role | Email | Access |
|------|-------|--------|
| Super Admin | \`superadmin.en@immobilier.ch\` | Full platform access |
| Platform Admin | \`platformadmin1.en@immobilier.ch\` | Platform management |
| Agency Admin | \`agencyadmin1.en@immobilier.ch\` | Agency management |
| Agent | \`agent1.en@immobilier.ch\` | Property CRUD |
| Owner | \`owner1.en@immobilier.ch\` | Own property management |
| End User | \`user1.en@immobilier.ch\` | Browse, favorites, alerts |

> Accounts are also available in **fr**, **de**, and **it** (replace \`.en\` with the language code).

### User Types & Access Levels

| Type | Admin Panel | Agency Panel | Agent Panel | Public |
|------|:-----------:|:------------:|:-----------:|:------:|
| super_admin | ✅ | ✅ | ✅ | ✅ |
| platform_admin | ✅ | ✅ | ✅ | ✅ |
| agency_admin | ❌ | ✅ | ✅ | ✅ |
| agent | ❌ | ❌ | ✅ | ✅ |
| owner | ❌ | ❌ | ✅ | ✅ |
| end_user | ❌ | ❌ | ❌ | ✅ |

### Multilingual Support

All endpoints accept the \`Accept-Language\` header with values: **en**, **fr**, **de**, **it**.
Translatable content (property titles, descriptions, categories, amenities) is returned in the requested language.

### Authentication Flow

1. **Login** → \`POST /api/v1/public/auth/login\` → returns \`accessToken\` + \`refreshToken\`
2. **Use token** → \`Authorization: Bearer {accessToken}\` header
3. **Refresh** → \`POST /api/v1/public/auth/refresh\` with refresh token
4. **Logout** → \`POST /api/v1/public/auth/logout\`
`,
    },
    servers: [
      ...(isProd
        ? [{ url: 'https://immobilier-api.swiftapp.ch', description: 'Production' }]
        : []),
      { url: `http://localhost:${config.port}`, description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Login via `/api/v1/public/auth/login` to get a token',
        },
      },
      parameters: {
        AcceptLanguage: {
          name: 'Accept-Language',
          in: 'header',
          schema: { type: 'string', enum: ['en', 'fr', 'de', 'it'], default: 'en' },
          description: 'Response language',
        },
        IdParam: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'MongoDB ObjectId',
        },
        PageParam: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1, minimum: 1 },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: { type: 'object' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPrevPage: { type: 'boolean' },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'superadmin.en@immobilier.ch' },
            password: { type: 'string', example: 'Password123!' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    user_type: { type: 'string' },
                  },
                },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'first_name', 'last_name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, description: 'Must have uppercase, lowercase, digit, and special character' },
            first_name: { type: 'string', maxLength: 100 },
            last_name: { type: 'string', maxLength: 100 },
            phone: { type: 'string' },
            user_type: { type: 'string', enum: ['end_user', 'owner', 'agent', 'agency_admin'] },
            preferred_language: { type: 'string', enum: ['en', 'fr', 'de', 'it'] },
          },
        },
        Canton: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            code: { type: 'string', example: 'VD' },
            name: { type: 'object', properties: { en: { type: 'string' }, fr: { type: 'string' }, de: { type: 'string' }, it: { type: 'string' } } },
            capital: { type: 'string' },
            population: { type: 'integer' },
            area_km2: { type: 'number' },
          },
        },
        City: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            postal_code: { type: 'string' },
            canton_id: { type: 'string' },
            population: { type: 'integer' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'object', properties: { en: { type: 'string' }, fr: { type: 'string' }, de: { type: 'string' }, it: { type: 'string' } } },
            slug: { type: 'string' },
            section: { type: 'string' },
            icon: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        Amenity: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'object', properties: { en: { type: 'string' }, fr: { type: 'string' }, de: { type: 'string' }, it: { type: 'string' } } },
            group: { type: 'string' },
            icon: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        Agency: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            canton_id: { type: 'string' },
            city_id: { type: 'string' },
            is_verified: { type: 'boolean' },
            logo_url: { type: 'string' },
          },
        },
        Property: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'object', properties: { en: { type: 'string' }, fr: { type: 'string' }, de: { type: 'string' }, it: { type: 'string' } } },
            description: { type: 'object', properties: { en: { type: 'string' }, fr: { type: 'string' }, de: { type: 'string' }, it: { type: 'string' } } },
            transaction_type: { type: 'string', enum: ['rent', 'buy'] },
            price: { type: 'number' },
            rooms: { type: 'number' },
            surface: { type: 'number' },
            status: { type: 'string', enum: ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] },
            category_id: { type: 'string' },
            canton_id: { type: 'string' },
            city_id: { type: 'string' },
            agency_id: { type: 'string' },
            images: { type: 'array', items: { type: 'object' } },
            amenities: { type: 'array', items: { type: 'string' } },
            published_at: { type: 'string', format: 'date-time' },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            property_id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            message: { type: 'string' },
            status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'lost', 'converted'] },
            assigned_to: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            phone: { type: 'string' },
            user_type: { type: 'string', enum: ['end_user', 'owner', 'agent', 'agency_admin', 'platform_admin', 'super_admin'] },
            status: { type: 'string', enum: ['active', 'pending', 'suspended', 'inactive'] },
            preferred_language: { type: 'string', enum: ['en', 'fr', 'de', 'it'] },
            agency_id: { type: 'string' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid JWT token',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        ValidationError: {
          description: 'Validation failed',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & registration' },
      { name: 'Cantons', description: 'Swiss cantons (public)' },
      { name: 'Cities', description: 'Swiss cities (public)' },
      { name: 'Categories', description: 'Property categories (public)' },
      { name: 'Amenities', description: 'Property amenities (public)' },
      { name: 'Agencies', description: 'Real-estate agencies (public)' },
      { name: 'Properties', description: 'Property listings (public)' },
      { name: 'Search', description: 'Search & autocomplete (public)' },
      { name: 'Leads', description: 'Contact & inquiry forms (public)' },
      { name: 'User Profile', description: 'User profile, favorites & alerts (auth required)' },
      { name: 'Agent Properties', description: 'Agent property management (auth required)' },
      { name: 'Agent Leads', description: 'Agent lead access (auth required)' },
      { name: 'Agency Leads', description: 'Agency lead management (agency members)' },
      { name: 'Admin Locations', description: 'Location management (admin)' },
      { name: 'Admin Categories', description: 'Category management (admin)' },
      { name: 'Admin Amenities', description: 'Amenity management (admin)' },
      { name: 'Admin Agencies', description: 'Agency management (admin)' },
      { name: 'Admin Properties', description: 'Property management (admin)' },
      { name: 'Admin Users', description: 'User management (admin)' },
      { name: 'Admin Translations', description: 'Translation management (admin)' },
      { name: 'Admin Permissions', description: 'Permission management (admin)' },
      { name: 'Admin Roles', description: 'Role & permission assignment (admin)' },
      { name: 'Admin Leads', description: 'Lead management (admin)' },
      { name: 'Admin Search', description: 'Search cache management (admin)' },
    ],
    paths: {
      // ============================================================
      // HEALTH & ROOT
      // ============================================================
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: { 200: { description: 'API is healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
        },
      },

      // ============================================================
      // AUTH
      // ============================================================
      '/api/v1/public/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/public/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register new user',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
          responses: {
            201: { description: 'Registration successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
            422: { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/api/v1/public/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description: 'Send refresh token in body, cookie, or Authorization header',
          responses: { 200: { description: 'New tokens issued' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/api/v1/public/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Logged out' } },
        },
      },
      '/api/v1/public/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Current user profile' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
        patch: {
          tags: ['Auth'],
          summary: 'Update profile',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { first_name: { type: 'string' }, last_name: { type: 'string' }, phone: { type: 'string' }, preferred_language: { type: 'string', enum: ['en', 'fr', 'de', 'it'] } } } } } },
          responses: { 200: { description: 'Profile updated' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/api/v1/public/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Change password',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['current_password', 'new_password'], properties: { current_password: { type: 'string' }, new_password: { type: 'string', minLength: 8 } } } } } },
          responses: { 200: { description: 'Password changed' } },
        },
      },
      '/api/v1/public/auth/verify-email': {
        post: {
          tags: ['Auth'],
          summary: 'Verify email address',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 64, maxLength: 64 } } } } } },
          responses: { 200: { description: 'Email verified' } },
        },
      },
      '/api/v1/public/auth/resend-verification': {
        post: {
          tags: ['Auth'],
          summary: 'Resend verification email',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
          responses: { 200: { description: 'Verification email sent' } },
        },
      },
      '/api/v1/public/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request password reset',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
          responses: { 200: { description: 'Reset email sent (if account exists)' } },
        },
      },
      '/api/v1/public/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password with token',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string', minLength: 64 }, password: { type: 'string', minLength: 8 } } } } } },
          responses: { 200: { description: 'Password reset successful' } },
        },
      },

      // ============================================================
      // CANTONS (PUBLIC)
      // ============================================================
      '/api/v1/public/locations/cantons': {
        get: {
          tags: ['Cantons'],
          summary: 'Get all cantons',
          parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'List of cantons', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } },
        },
      },
      '/api/v1/public/locations/cantons/code/{code}': {
        get: {
          tags: ['Cantons'],
          summary: 'Get canton by code',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'VD' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Canton details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/v1/public/locations/cantons/{id}': {
        get: {
          tags: ['Cantons'],
          summary: 'Get canton by ID',
          parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Canton details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/v1/public/locations/cantons/{id}/cities': {
        get: {
          tags: ['Cantons'],
          summary: 'Get cities in canton',
          parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'List of cities in canton' } },
        },
      },

      // ============================================================
      // CITIES (PUBLIC)
      // ============================================================
      '/api/v1/public/locations/cities': {
        get: {
          tags: ['Cities'],
          summary: 'Get all cities',
          parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'List of cities' } },
        },
      },
      '/api/v1/public/locations/cities/popular': {
        get: {
          tags: ['Cities'],
          summary: 'Popular cities with property counts',
          parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Popular cities' } },
        },
      },
      '/api/v1/public/locations/cities/search': {
        get: {
          tags: ['Cities'],
          summary: 'Search cities by name',
          parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Search results' } },
        },
      },
      '/api/v1/public/locations/cities/postal/{postalCode}': {
        get: {
          tags: ['Cities'],
          summary: 'Get cities by postal code',
          parameters: [{ name: 'postalCode', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Cities matching postal code' } },
        },
      },
      '/api/v1/public/locations/cities/{id}': {
        get: {
          tags: ['Cities'],
          summary: 'Get city by ID',
          parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'City details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      // ============================================================
      // CATEGORIES (PUBLIC)
      // ============================================================
      '/api/v1/public/categories': {
        get: {
          tags: ['Categories'],
          summary: 'Get all categories',
          parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'List of categories' } },
        },
      },
      '/api/v1/public/categories/slug/{slug}': {
        get: {
          tags: ['Categories'],
          summary: 'Get category by slug',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Category details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/v1/public/categories/section/{section}': {
        get: {
          tags: ['Categories'],
          summary: 'Get categories by section',
          parameters: [{ name: 'section', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Categories in section' } },
        },
      },
      '/api/v1/public/categories/{id}': {
        get: {
          tags: ['Categories'],
          summary: 'Get category by ID',
          parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Category details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      // ============================================================
      // AMENITIES (PUBLIC)
      // ============================================================
      '/api/v1/public/amenities': {
        get: {
          tags: ['Amenities'],
          summary: 'Get all amenities',
          parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'List of amenities' } },
        },
      },
      '/api/v1/public/amenities/group/{group}': {
        get: {
          tags: ['Amenities'],
          summary: 'Get amenities by group',
          parameters: [{ name: 'group', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Amenities in group' } },
        },
      },
      '/api/v1/public/amenities/{id}': {
        get: {
          tags: ['Amenities'],
          summary: 'Get amenity by ID',
          parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Amenity details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      // ============================================================
      // AGENCIES (PUBLIC)
      // ============================================================
      '/api/v1/public/agencies': {
        get: {
          tags: ['Agencies'],
          summary: 'Get all agencies',
          parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'List of agencies' } },
        },
      },
      '/api/v1/public/agencies/slug/{slug}': {
        get: {
          tags: ['Agencies'],
          summary: 'Get agency by slug',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Agency details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/v1/public/agencies/canton/{cantonId}': {
        get: {
          tags: ['Agencies'],
          summary: 'Get agencies by canton',
          parameters: [{ name: 'cantonId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Agencies in canton' } },
        },
      },
      '/api/v1/public/agencies/city/{cityId}': {
        get: {
          tags: ['Agencies'],
          summary: 'Get agencies by city',
          parameters: [{ name: 'cityId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Agencies in city' } },
        },
      },
      '/api/v1/public/agencies/{id}': {
        get: {
          tags: ['Agencies'],
          summary: 'Get agency by ID',
          parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Agency details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      // ============================================================
      // PROPERTIES (PUBLIC)
      // ============================================================
      '/api/v1/public/properties': {
        get: {
          tags: ['Properties'],
          summary: 'Get published properties',
          parameters: [
            { $ref: '#/components/parameters/AcceptLanguage' },
            { $ref: '#/components/parameters/PageParam' },
            { $ref: '#/components/parameters/LimitParam' },
            { name: 'transaction_type', in: 'query', schema: { type: 'string', enum: ['rent', 'buy'] } },
            { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['published_at', 'price', 'rooms', 'surface'] } },
            { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
            { name: 'status', in: 'query', schema: { type: 'string', default: 'PUBLISHED' } },
            { name: 'canton_id', in: 'query', schema: { type: 'string' } },
            { name: 'city_id', in: 'query', schema: { type: 'string' } },
            { name: 'category_id', in: 'query', schema: { type: 'string' } },
            { name: 'price_min', in: 'query', schema: { type: 'number' } },
            { name: 'price_max', in: 'query', schema: { type: 'number' } },
            { name: 'rooms_min', in: 'query', schema: { type: 'number' } },
            { name: 'rooms_max', in: 'query', schema: { type: 'number' } },
            { name: 'surface_min', in: 'query', schema: { type: 'number' } },
            { name: 'surface_max', in: 'query', schema: { type: 'number' } },
          ],
          responses: { 200: { description: 'Paginated properties', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } },
        },
      },
      '/api/v1/public/properties/cursor': {
        get: {
          tags: ['Properties'],
          summary: 'Get properties (cursor pagination)',
          parameters: [
            { $ref: '#/components/parameters/AcceptLanguage' },
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'Properties with cursor' } },
        },
      },
      '/api/v1/public/properties/external/{externalId}': {
        get: {
          tags: ['Properties'],
          summary: 'Get property by external ID',
          parameters: [{ name: 'externalId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Property details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/v1/public/properties/canton/{cantonId}': {
        get: {
          tags: ['Properties'],
          summary: 'Get properties by canton',
          parameters: [{ name: 'cantonId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'Properties in canton' } },
        },
      },
      '/api/v1/public/properties/city/{cityId}': {
        get: {
          tags: ['Properties'],
          summary: 'Get properties by city',
          parameters: [{ name: 'cityId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'Properties in city' } },
        },
      },
      '/api/v1/public/properties/agency/{agencyId}': {
        get: {
          tags: ['Properties'],
          summary: 'Get properties by agency',
          parameters: [{ name: 'agencyId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'Properties by agency' } },
        },
      },
      '/api/v1/public/properties/category/{categoryId}': {
        get: {
          tags: ['Properties'],
          summary: 'Get properties by category',
          parameters: [{ name: 'categoryId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'Properties by category' } },
        },
      },
      '/api/v1/public/properties/{id}': {
        get: {
          tags: ['Properties'],
          summary: 'Get property by ID',
          parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Property details' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/v1/public/properties/{id}/images': {
        get: {
          tags: ['Properties'],
          summary: 'Get property images',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Property images' } },
        },
      },

      // ============================================================
      // PROPERTY TRANSLATIONS (PUBLIC)
      // ============================================================
      '/api/v1/public/properties/{propertyId}/translations': {
        get: {
          tags: ['Properties'],
          summary: 'Get approved translations for property',
          parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
          responses: { 200: { description: 'Property translations' } },
        },
      },
      '/api/v1/public/properties/{propertyId}/translations/{language}': {
        get: {
          tags: ['Properties'],
          summary: 'Get translation by language',
          parameters: [
            { name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'language', in: 'path', required: true, schema: { type: 'string', enum: ['en', 'fr', 'de', 'it'] } },
          ],
          responses: { 200: { description: 'Translation for language' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      // ============================================================
      // SEARCH (PUBLIC)
      // ============================================================
      '/api/v1/public/search': {
        get: {
          tags: ['Search'],
          summary: 'Unified search',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search term' },
            { name: 'lang', in: 'query', schema: { type: 'string', enum: ['en', 'fr', 'de', 'it'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Search results' } },
        },
      },
      '/api/v1/public/search/properties': {
        get: {
          tags: ['Search'],
          summary: 'Search properties',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { $ref: '#/components/parameters/PageParam' },
            { $ref: '#/components/parameters/LimitParam' },
            { name: 'canton_id', in: 'query', schema: { type: 'string' } },
            { name: 'city_id', in: 'query', schema: { type: 'string' } },
            { name: 'category_id', in: 'query', schema: { type: 'string' } },
            { name: 'transaction_type', in: 'query', schema: { type: 'string', enum: ['rent', 'buy'] } },
            { name: 'price_min', in: 'query', schema: { type: 'number' } },
            { name: 'price_max', in: 'query', schema: { type: 'number' } },
            { name: 'rooms_min', in: 'query', schema: { type: 'number' } },
            { name: 'rooms_max', in: 'query', schema: { type: 'number' } },
            { name: 'surface_min', in: 'query', schema: { type: 'number' } },
            { name: 'surface_max', in: 'query', schema: { type: 'number' } },
            { name: 'sort', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Property search results' } },
        },
      },
      '/api/v1/public/search/properties/cursor': {
        get: {
          tags: ['Search'],
          summary: 'Search properties (cursor pagination)',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Cursor-paginated results' } },
        },
      },
      '/api/v1/public/search/locations': {
        get: {
          tags: ['Search'],
          summary: 'Search locations',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'lang', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'include_cantons', in: 'query', schema: { type: 'boolean' } },
            { name: 'include_cities', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: { 200: { description: 'Location search results' } },
        },
      },
      '/api/v1/public/search/suggestions': {
        get: {
          tags: ['Search'],
          summary: 'Autocomplete suggestions',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'lang', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Suggestions' } },
        },
      },
      '/api/v1/public/search/facets': {
        get: {
          tags: ['Search'],
          summary: 'Search facets',
          parameters: [{ name: 'lang', in: 'query', schema: { type: 'string' } }, { name: 'fields', in: 'query', schema: { type: 'string' } }],
          responses: { 200: { description: 'Facet counts' } },
        },
      },

      // ============================================================
      // LEADS (PUBLIC)
      // ============================================================
      '/api/v1/public/leads': {
        post: {
          tags: ['Leads'],
          summary: 'Submit contact form (public)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['property_id', 'name', 'email', 'message'], properties: { property_id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, message: { type: 'string' } } } } } },
          responses: { 201: { description: 'Lead created' }, 422: { $ref: '#/components/responses/ValidationError' } },
        },
      },
      '/api/v1/public/leads/authenticated': {
        post: {
          tags: ['Leads'],
          summary: 'Submit inquiry (authenticated)',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['property_id', 'message'], properties: { property_id: { type: 'string' }, message: { type: 'string' } } } } } },
          responses: { 201: { description: 'Lead created' } },
        },
      },
      '/api/v1/public/leads/my-inquiries': {
        get: {
          tags: ['Leads'],
          summary: 'Get my inquiries',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'User inquiries' } },
        },
      },

      // ============================================================
      // USER PROFILE (AUTH REQUIRED)
      // ============================================================
      '/api/v1/public/users/dashboard/stats': {
        get: {
          tags: ['User Profile'],
          summary: 'Dashboard statistics',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Dashboard stats' } },
        },
      },
      '/api/v1/public/users/account': {
        delete: {
          tags: ['User Profile'],
          summary: 'Deactivate account',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Account deactivated' } },
        },
      },
      '/api/v1/public/users/avatar': {
        post: {
          tags: ['User Profile'],
          summary: 'Upload avatar',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } },
          responses: { 200: { description: 'Avatar uploaded' } },
        },
        delete: {
          tags: ['User Profile'],
          summary: 'Delete avatar',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Avatar deleted' } },
        },
      },
      '/api/v1/public/users/settings': {
        get: {
          tags: ['User Profile'],
          summary: 'Get user settings',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'User settings' } },
        },
        patch: {
          tags: ['User Profile'],
          summary: 'Update user settings',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Settings updated' } },
        },
      },
      '/api/v1/public/users/profile': {
        get: {
          tags: ['User Profile'],
          summary: 'Get profile',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'User profile' } },
        },
        put: {
          tags: ['User Profile'],
          summary: 'Update profile',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Profile updated' } },
        },
      },
      '/api/v1/public/users/favorites': {
        get: {
          tags: ['User Profile'],
          summary: 'Get favorite properties',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Favorite properties' } },
        },
        post: {
          tags: ['User Profile'],
          summary: 'Add to favorites',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['property_id'], properties: { property_id: { type: 'string' } } } } } },
          responses: { 201: { description: 'Added to favorites' } },
        },
      },
      '/api/v1/public/users/favorites/ids': {
        get: {
          tags: ['User Profile'],
          summary: 'Get favorite property IDs',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Array of property IDs' } },
        },
      },
      '/api/v1/public/users/favorites/{propertyId}': {
        get: {
          tags: ['User Profile'],
          summary: 'Check if property is favorite',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Favorite status' } },
        },
        delete: {
          tags: ['User Profile'],
          summary: 'Remove from favorites',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Removed from favorites' } },
        },
      },
      '/api/v1/public/users/alerts': {
        get: {
          tags: ['User Profile'],
          summary: 'Get search alerts',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'User alerts' } },
        },
        post: {
          tags: ['User Profile'],
          summary: 'Create search alert',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Alert created' } },
        },
      },
      '/api/v1/public/users/alerts/{id}': {
        get: {
          tags: ['User Profile'],
          summary: 'Get alert by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Alert details' } },
        },
        put: {
          tags: ['User Profile'],
          summary: 'Update alert',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Alert updated' } },
        },
        delete: {
          tags: ['User Profile'],
          summary: 'Delete alert',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Alert deleted' } },
        },
      },
      '/api/v1/public/users/alerts/{id}/toggle': {
        patch: {
          tags: ['User Profile'],
          summary: 'Toggle alert active/inactive',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Alert toggled' } },
        },
      },

      // ============================================================
      // AGENT PROPERTIES
      // ============================================================
      '/api/v1/agent/properties': {
        get: {
          tags: ['Agent Properties'],
          summary: 'Get own properties',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'Agent properties' } },
        },
        post: {
          tags: ['Agent Properties'],
          summary: 'Create property',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Property created' } },
        },
      },
      '/api/v1/agent/properties/statistics': {
        get: {
          tags: ['Agent Properties'],
          summary: 'Own property statistics',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Statistics' } },
        },
      },
      '/api/v1/agent/properties/{id}': {
        get: {
          tags: ['Agent Properties'],
          summary: 'Get own property',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Property details' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
        put: {
          tags: ['Agent Properties'],
          summary: 'Update own property',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Property updated' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
        delete: {
          tags: ['Agent Properties'],
          summary: 'Delete own property',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Property deleted' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/agent/properties/{id}/submit': {
        post: {
          tags: ['Agent Properties'],
          summary: 'Submit property for approval',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Submitted' } },
        },
      },
      '/api/v1/agent/properties/{id}/archive': {
        post: {
          tags: ['Agent Properties'],
          summary: 'Archive property',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Archived' } },
        },
      },
      '/api/v1/agent/properties/{id}/images': {
        get: {
          tags: ['Agent Properties'],
          summary: 'Get property images',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Images' } },
        },
      },
      '/api/v1/agent/properties/{id}/images/upload': {
        post: {
          tags: ['Agent Properties'],
          summary: 'Upload property image',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } } },
          responses: { 201: { description: 'Image uploaded' } },
        },
      },
      '/api/v1/agent/properties/{id}/images/upload-multiple': {
        post: {
          tags: ['Agent Properties'],
          summary: 'Upload multiple images',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } },
          responses: { 201: { description: 'Images uploaded' } },
        },
      },

      // ============================================================
      // AGENT LEADS
      // ============================================================
      '/api/v1/agent/leads': {
        get: {
          tags: ['Agent Leads'],
          summary: 'Get assigned leads',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Assigned leads' } },
        },
      },
      '/api/v1/agent/leads/follow-up': {
        get: {
          tags: ['Agent Leads'],
          summary: 'Leads requiring follow-up',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Follow-up leads' } },
        },
      },
      '/api/v1/agent/leads/{id}': {
        get: {
          tags: ['Agent Leads'],
          summary: 'Get assigned lead',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Lead details' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },

      // ============================================================
      // AGENCY LEADS
      // ============================================================
      '/api/v1/agency/leads': {
        get: {
          tags: ['Agency Leads'],
          summary: 'Get agency leads',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'Agency leads' } },
        },
      },
      '/api/v1/agency/leads/statistics': {
        get: {
          tags: ['Agency Leads'],
          summary: 'Agency lead statistics',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Statistics' } },
        },
      },
      '/api/v1/agency/leads/follow-up': {
        get: {
          tags: ['Agency Leads'],
          summary: 'Leads requiring follow-up',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Follow-up leads' } },
        },
      },
      '/api/v1/agency/leads/property/{propertyId}': {
        get: {
          tags: ['Agency Leads'],
          summary: 'Leads by property',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Property leads' } },
        },
      },
      '/api/v1/agency/leads/{id}': {
        get: {
          tags: ['Agency Leads'],
          summary: 'Get lead by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Lead details' } },
        },
        patch: {
          tags: ['Agency Leads'],
          summary: 'Update lead',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Lead updated' } },
        },
      },
      '/api/v1/agency/leads/{id}/status': {
        patch: {
          tags: ['Agency Leads'],
          summary: 'Update lead status',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'lost', 'converted'] } } } } } },
          responses: { 200: { description: 'Status updated' } },
        },
      },
      '/api/v1/agency/leads/{id}/assign': {
        patch: {
          tags: ['Agency Leads'],
          summary: 'Assign lead to agent',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['assigned_to'], properties: { assigned_to: { type: 'string' } } } } } },
          responses: { 200: { description: 'Lead assigned' } },
        },
      },
      '/api/v1/agency/leads/{id}/notes': {
        post: {
          tags: ['Agency Leads'],
          summary: 'Add note to lead',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } },
          responses: { 201: { description: 'Note added' } },
        },
      },

      // ============================================================
      // ADMIN LOCATIONS
      // ============================================================
      '/api/v1/admin/locations/cantons': {
        post: {
          tags: ['Admin Locations'],
          summary: 'Create canton',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Canton created' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/admin/locations/cantons/{id}': {
        patch: {
          tags: ['Admin Locations'],
          summary: 'Update canton',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Canton updated' } },
        },
        delete: {
          tags: ['Admin Locations'],
          summary: 'Delete canton',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Canton deleted' } },
        },
      },
      '/api/v1/admin/locations/cities': {
        post: {
          tags: ['Admin Locations'],
          summary: 'Create city',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'City created' } },
        },
      },
      '/api/v1/admin/locations/cities/{id}': {
        patch: {
          tags: ['Admin Locations'],
          summary: 'Update city',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'City updated' } },
        },
        delete: {
          tags: ['Admin Locations'],
          summary: 'Delete city',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'City deleted' } },
        },
      },

      // ============================================================
      // ADMIN CATEGORIES
      // ============================================================
      '/api/v1/admin/categories': {
        post: {
          tags: ['Admin Categories'],
          summary: 'Create category',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Category created' } },
        },
      },
      '/api/v1/admin/categories/{id}': {
        patch: {
          tags: ['Admin Categories'],
          summary: 'Update category',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Category updated' } },
        },
        delete: {
          tags: ['Admin Categories'],
          summary: 'Delete category',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Category deleted' } },
        },
      },

      // ============================================================
      // ADMIN AMENITIES
      // ============================================================
      '/api/v1/admin/amenities': {
        get: {
          tags: ['Admin Amenities'],
          summary: 'Get all amenities (including inactive)',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'All amenities' } },
        },
        post: {
          tags: ['Admin Amenities'],
          summary: 'Create amenity',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Amenity created' } },
        },
      },
      '/api/v1/admin/amenities/{id}': {
        patch: {
          tags: ['Admin Amenities'],
          summary: 'Update amenity',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Amenity updated' } },
        },
        delete: {
          tags: ['Admin Amenities'],
          summary: 'Delete amenity',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Amenity deleted' } },
        },
      },

      // ============================================================
      // ADMIN AGENCIES
      // ============================================================
      '/api/v1/admin/agencies': {
        get: {
          tags: ['Admin Agencies'],
          summary: 'Get all agencies',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'All agencies' } },
        },
        post: {
          tags: ['Admin Agencies'],
          summary: 'Create agency',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Agency created' } },
        },
      },
      '/api/v1/admin/agencies/statistics': {
        get: {
          tags: ['Admin Agencies'],
          summary: 'Agency statistics',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Statistics' } },
        },
      },
      '/api/v1/admin/agencies/{id}': {
        get: {
          tags: ['Admin Agencies'],
          summary: 'Get agency by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Agency details' } },
        },
        patch: {
          tags: ['Admin Agencies'],
          summary: 'Update agency',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Agency updated' } },
        },
        delete: {
          tags: ['Admin Agencies'],
          summary: 'Delete agency',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Agency deleted' } },
        },
      },
      '/api/v1/admin/agencies/{id}/verify': {
        post: {
          tags: ['Admin Agencies'],
          summary: 'Verify agency',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Agency verified' } },
        },
      },
      '/api/v1/admin/agencies/{id}/unverify': {
        post: {
          tags: ['Admin Agencies'],
          summary: 'Unverify agency',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Agency unverified' } },
        },
      },
      '/api/v1/admin/agencies/{id}/status': {
        patch: {
          tags: ['Admin Agencies'],
          summary: 'Update agency status',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Status updated' } },
        },
      },

      // ============================================================
      // ADMIN PROPERTIES
      // ============================================================
      '/api/v1/admin/properties': {
        get: {
          tags: ['Admin Properties'],
          summary: 'Get all properties (including unpublished)',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'All properties' } },
        },
        post: {
          tags: ['Admin Properties'],
          summary: 'Create property',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Property created' } },
        },
      },
      '/api/v1/admin/properties/statistics': {
        get: {
          tags: ['Admin Properties'],
          summary: 'Property statistics',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Statistics' } },
        },
      },
      '/api/v1/admin/properties/{id}': {
        get: {
          tags: ['Admin Properties'],
          summary: 'Get property (admin view)',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Property details' } },
        },
        put: {
          tags: ['Admin Properties'],
          summary: 'Update property',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Property updated' } },
        },
        delete: {
          tags: ['Admin Properties'],
          summary: 'Delete property',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Property deleted' } },
        },
      },
      '/api/v1/admin/properties/{id}/submit': { post: { tags: ['Admin Properties'], summary: 'Submit for approval', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Submitted' } } } },
      '/api/v1/admin/properties/{id}/approve': { post: { tags: ['Admin Properties'], summary: 'Approve property', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Approved' } } } },
      '/api/v1/admin/properties/{id}/reject': { post: { tags: ['Admin Properties'], summary: 'Reject property', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Rejected' } } } },
      '/api/v1/admin/properties/{id}/publish': { post: { tags: ['Admin Properties'], summary: 'Publish property', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Published' } } } },
      '/api/v1/admin/properties/{id}/archive': { post: { tags: ['Admin Properties'], summary: 'Archive property', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Archived' } } } },
      '/api/v1/admin/properties/{id}/status': { patch: { tags: ['Admin Properties'], summary: 'Update property status', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Status updated' } } } },
      '/api/v1/admin/properties/{id}/images': {
        get: { tags: ['Admin Properties'], summary: 'Get property images', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Images' } } },
        delete: { tags: ['Admin Properties'], summary: 'Delete all images', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'All images deleted' } } },
      },
      '/api/v1/admin/properties/{id}/images/upload': { post: { tags: ['Admin Properties'], summary: 'Upload image', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } } }, responses: { 201: { description: 'Image uploaded' } } } },
      '/api/v1/admin/properties/{id}/images/upload-multiple': { post: { tags: ['Admin Properties'], summary: 'Upload multiple images', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 201: { description: 'Images uploaded' } } } },
      '/api/v1/admin/properties/{id}/images/reorder': { post: { tags: ['Admin Properties'], summary: 'Reorder images', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Images reordered' } } } },
      '/api/v1/admin/properties/{id}/images/{imageId}': {
        put: { tags: ['Admin Properties'], summary: 'Update image', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Image updated' } } },
        delete: { tags: ['Admin Properties'], summary: 'Delete image', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Image deleted' } } },
      },
      '/api/v1/admin/properties/{id}/images/{imageId}/primary': { post: { tags: ['Admin Properties'], summary: 'Set primary image', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Primary image set' } } } },

      // ============================================================
      // ADMIN USERS
      // ============================================================
      '/api/v1/admin/users': {
        get: {
          tags: ['Admin Users'],
          summary: 'Get all users',
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
          responses: { 200: { description: 'All users' } },
        },
        post: {
          tags: ['Admin Users'],
          summary: 'Create user',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'User created' } },
        },
      },
      '/api/v1/admin/users/statistics': {
        get: { tags: ['Admin Users'], summary: 'User statistics', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Statistics' } } },
      },
      '/api/v1/admin/users/{id}': {
        get: { tags: ['Admin Users'], summary: 'Get user by ID', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'User details' } } },
        put: { tags: ['Admin Users'], summary: 'Update user', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'User updated' } } },
        delete: { tags: ['Admin Users'], summary: 'Delete user', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'User deleted' } } },
      },
      '/api/v1/admin/users/{id}/status': { patch: { tags: ['Admin Users'], summary: 'Update user status', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Status updated' } } } },
      '/api/v1/admin/users/{id}/suspend': { post: { tags: ['Admin Users'], summary: 'Suspend user', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'User suspended' } } } },
      '/api/v1/admin/users/{id}/activate': { post: { tags: ['Admin Users'], summary: 'Activate user', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'User activated' } } } },

      // ============================================================
      // ADMIN TRANSLATIONS
      // ============================================================
      '/api/v1/admin/translations': {
        get: { tags: ['Admin Translations'], summary: 'Get all translations', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }], responses: { 200: { description: 'All translations' } } },
        post: { tags: ['Admin Translations'], summary: 'Create translation', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Translation created' } } },
      },
      '/api/v1/admin/translations/pending': { get: { tags: ['Admin Translations'], summary: 'Get pending translations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Pending translations' } } } },
      '/api/v1/admin/translations/statistics': { get: { tags: ['Admin Translations'], summary: 'Translation statistics', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Statistics' } } } },
      '/api/v1/admin/translations/bulk-approve': { post: { tags: ['Admin Translations'], summary: 'Bulk approve translations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Translations approved' } } } },
      '/api/v1/admin/translations/{id}': {
        get: { tags: ['Admin Translations'], summary: 'Get translation by ID', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Translation details' } } },
        patch: { tags: ['Admin Translations'], summary: 'Update translation', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Translation updated' } } },
        delete: { tags: ['Admin Translations'], summary: 'Delete translation', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Translation deleted' } } },
      },
      '/api/v1/admin/translations/{id}/approve': { post: { tags: ['Admin Translations'], summary: 'Approve translation', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Approved' } } } },
      '/api/v1/admin/translations/{id}/reject': { post: { tags: ['Admin Translations'], summary: 'Reject translation', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Rejected' } } } },
      '/api/v1/admin/translations/{id}/reset': { post: { tags: ['Admin Translations'], summary: 'Reset to pending', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Reset' } } } },
      '/api/v1/admin/translations/properties/{propertyId}/translations': {
        get: { tags: ['Admin Translations'], summary: 'Get translations for property', security: [{ bearerAuth: [] }], parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Property translations' } } },
      },
      '/api/v1/admin/translations/properties/{propertyId}/translations/status': {
        get: { tags: ['Admin Translations'], summary: 'Translation status for property', security: [{ bearerAuth: [] }], parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Status summary' } } },
      },
      '/api/v1/admin/translations/properties/{propertyId}/translations/request': {
        post: { tags: ['Admin Translations'], summary: 'Request translations for property', security: [{ bearerAuth: [] }], parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Translations requested' } } },
      },

      // ============================================================
      // ADMIN PERMISSIONS
      // ============================================================
      '/api/v1/admin/permissions': {
        get: { tags: ['Admin Permissions'], summary: 'Get all permissions', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }], responses: { 200: { description: 'All permissions' } } },
        post: { tags: ['Admin Permissions'], summary: 'Create permission', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Permission created' } } },
      },
      '/api/v1/admin/permissions/resources': { get: { tags: ['Admin Permissions'], summary: 'Get unique resources', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Resources' } } } },
      '/api/v1/admin/permissions/grouped': { get: { tags: ['Admin Permissions'], summary: 'Get permissions grouped by resource', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Grouped permissions' } } } },
      '/api/v1/admin/permissions/active': { get: { tags: ['Admin Permissions'], summary: 'Get active permissions', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Active permissions' } } } },
      '/api/v1/admin/permissions/name/{name}': { get: { tags: ['Admin Permissions'], summary: 'Get permission by name', security: [{ bearerAuth: [] }], parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Permission details' } } } },
      '/api/v1/admin/permissions/resource/{resource}': { get: { tags: ['Admin Permissions'], summary: 'Get permissions by resource', security: [{ bearerAuth: [] }], parameters: [{ name: 'resource', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Permissions for resource' } } } },
      '/api/v1/admin/permissions/{id}': {
        get: { tags: ['Admin Permissions'], summary: 'Get permission by ID', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Permission details' } } },
        put: { tags: ['Admin Permissions'], summary: 'Update permission', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Permission updated' } } },
        delete: { tags: ['Admin Permissions'], summary: 'Soft delete permission', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Permission deleted' } } },
      },
      '/api/v1/admin/permissions/{id}/permanent': { delete: { tags: ['Admin Permissions'], summary: 'Permanently delete permission', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Permanently deleted' } } } },

      // ============================================================
      // ADMIN ROLES
      // ============================================================
      '/api/v1/admin/roles': {
        get: { tags: ['Admin Roles'], summary: 'Get all roles', security: [{ bearerAuth: [] }], responses: { 200: { description: 'All roles' } } },
        post: { tags: ['Admin Roles'], summary: 'Create role', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Role created' } } },
      },
      '/api/v1/admin/roles/name/{name}': { get: { tags: ['Admin Roles'], summary: 'Get role by name', security: [{ bearerAuth: [] }], parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Role details' } } } },
      '/api/v1/admin/roles/{id}': {
        get: { tags: ['Admin Roles'], summary: 'Get role by ID', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Role details' } } },
        put: { tags: ['Admin Roles'], summary: 'Update role', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Role updated' } } },
        delete: { tags: ['Admin Roles'], summary: 'Delete role', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Role deleted' } } },
      },
      '/api/v1/admin/roles/{id}/permissions': {
        get: { tags: ['Admin Roles'], summary: 'Get role permissions', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Role permissions' } } },
        put: { tags: ['Admin Roles'], summary: 'Set role permissions (replace all)', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Permissions set' } } },
      },
      '/api/v1/admin/roles/{id}/permissions/assign': { post: { tags: ['Admin Roles'], summary: 'Add permissions to role', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Permissions assigned' } } } },
      '/api/v1/admin/roles/{id}/permissions/revoke': { post: { tags: ['Admin Roles'], summary: 'Revoke permissions from role', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Permissions revoked' } } } },

      // ============================================================
      // ADMIN LEADS
      // ============================================================
      '/api/v1/admin/leads': {
        get: { tags: ['Admin Leads'], summary: 'Get all leads', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }], responses: { 200: { description: 'All leads' } } },
      },
      '/api/v1/admin/leads/statistics': { get: { tags: ['Admin Leads'], summary: 'Lead statistics', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Statistics' } } } },
      '/api/v1/admin/leads/follow-up': { get: { tags: ['Admin Leads'], summary: 'Leads requiring follow-up', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Follow-up leads' } } } },
      '/api/v1/admin/leads/property/{propertyId}': { get: { tags: ['Admin Leads'], summary: 'Leads by property', security: [{ bearerAuth: [] }], parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Property leads' } } } },
      '/api/v1/admin/leads/{id}': {
        get: { tags: ['Admin Leads'], summary: 'Get lead by ID', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Lead details' } } },
        patch: { tags: ['Admin Leads'], summary: 'Update lead', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Lead updated' } } },
        delete: { tags: ['Admin Leads'], summary: 'Delete lead', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Lead deleted' } } },
      },
      '/api/v1/admin/leads/{id}/status': { patch: { tags: ['Admin Leads'], summary: 'Update lead status', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Status updated' } } } },
      '/api/v1/admin/leads/{id}/assign': { patch: { tags: ['Admin Leads'], summary: 'Assign lead', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Lead assigned' } } } },
      '/api/v1/admin/leads/{id}/notes': { post: { tags: ['Admin Leads'], summary: 'Add note to lead', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 201: { description: 'Note added' } } } },

      // ============================================================
      // ADMIN SEARCH
      // ============================================================
      '/api/v1/admin/search/cache/invalidate': {
        post: { tags: ['Admin Search'], summary: 'Invalidate search cache', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Cache invalidated' } } },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
