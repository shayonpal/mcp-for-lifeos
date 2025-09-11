# Obsidian Vault Attachment Storage

## Storage Location
All attachments in the LifeOS Obsidian vault must be stored in:
**`00 - Meta/Attachments/`**

## File Types
This directory stores all binary and media files including:
- PDFs
- Images (PNG, JPG, GIF, etc.)
- Documents (DOC, DOCX, etc.)
- Audio files
- Video files
- Any other non-markdown attachments

## Purpose
Centralizing attachments in this location:
- Maintains consistent organization across the entire vault
- Simplifies backup and management of non-text files
- Clearly separates notes from media/binary content
- Makes attachment linking predictable from any note location

## Usage Guidelines
1. **Always** place new attachments in `00 - Meta/Attachments/`
2. Use descriptive, meaningful filenames
3. Link from notes using Obsidian's standard syntax:
   - Images: `![[image.png]]`
   - PDFs: `![[document.pdf]]`
   - Other files: `[[attachment.ext]]`

## Integration with MCP
When the MCP server handles file operations involving attachments, it should:
- Recognize this as the standard location for all attachments
- Move any attachments found elsewhere to this directory
- Update links accordingly when reorganizing