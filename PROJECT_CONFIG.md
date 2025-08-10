# Trust Link Ventures V2 - Project Configuration

## Supabase Configuration

**CRITICAL: Always verify these settings before making changes**

### Project Details
- **Project Name**: Trust Link Ventures V2  
- **Project ID**: `ppyfrftmexvgnsxlhdbz`
- **Project URL**: https://ppyfrftmexvgnsxlhdbz.supabase.co

### Configuration Files to Check
1. `supabase/config.toml` - project_id should be `ppyfrftmexvgnsxlhdbz`
2. `src/integrations/supabase/client.ts` - SUPABASE_URL should be `https://ppyfrftmexvgnsxlhdbz.supabase.co`
3. Any hardcoded URLs should use the correct project ID

### Before Making Changes
1. Run the validation: The app will automatically validate configuration on startup
2. Check console for validation messages
3. Verify you're connected to the correct project

### If You See Wrong Project Errors
- Check `supabase/config.toml` first
- Ensure no hardcoded URLs to other projects
- Update any references to old project IDs

### Emergency Recovery
If you accidentally connect to the wrong project:
1. Stop the development server
2. Check `supabase/config.toml` project_id
3. Check `src/integrations/supabase/client.ts` URLs
4. Restart the development server
5. Verify connection in browser console

## Old Projects to Avoid
- **Original Trust Link Ventures**: `utlgysjhopjvyiyzvvbo` (DO NOT USE)
- **New Gen Link CRM**: `fkvwpsddobuwvxsychvr` (DO NOT USE)