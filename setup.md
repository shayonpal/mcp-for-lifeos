# Setup Instructions

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mcp-for-lifeos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure for your vault**
   ```bash
   cp src/config.example.ts src/config.ts
   ```

4. **Edit `src/config.ts`** with your specific paths:
   ```typescript
   export const LIFEOS_CONFIG: LifeOSConfig = {
     vaultPath: '/Users/YOUR_USERNAME/path/to/your/vault',
     attachmentsPath: '/Users/YOUR_USERNAME/path/to/your/vault/00 - Meta/Attachments',
     templatesPath: '/Users/YOUR_USERNAME/path/to/your/vault/00 - Meta/Templates',
     dailyNotesPath: '/Users/YOUR_USERNAME/path/to/your/vault/20 - Areas/21 - Myself/Journals/Daily'
   };
   ```

5. **Customize people mappings** in `src/config.ts`:
   ```typescript
   PEOPLE_MAPPINGS: {
     'YourPartner': { people: ['[[YourPartner]]'], tags: ['partner'] },
     'YourPet': { people: ['[[YourPet]]'], tags: ['pet'] },
     // Add your specific people here
   }
   ```

6. **Build the project**
   ```bash
   npm run build
   ```

7. **Configure Claude Desktop**
   Add to your Claude Desktop config file:
   ```json
   {
     "mcpServers": {
       "lifeos": {
         "command": "node",
         "args": ["/path/to/your/mcp-for-lifeos/dist/index.js"]
       }
     }
   }
   ```

## Security Notes

- The `src/config.ts` file is gitignored to prevent accidental commits of personal paths
- Always use the example config as a template
- Never commit files containing personal vault paths or contact names

## Customization

Feel free to modify:
- Vault paths in config
- People mappings for your contacts  
- YAML rules to match your note-taking style
- Search parameters and scoring weights