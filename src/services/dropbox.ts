import { Dropbox, DropboxAuth } from 'dropbox';
import type { AppSettings } from '../types';

// We'll let the user input this, but we need to store/retrieve it.
// The redirect URI must drive the user back to our app.
// For GitHub Pages, it will be the deployed URL. For dev, localhost.
const REDIRECT_URI = window.location.origin + window.location.pathname;
console.log('Current Redirect URI:', REDIRECT_URI);
export const CLIENT_ID = 'oa453zne5pnx0u4';

export class DropboxService {
    private dbx: Dropbox | null = null;
    private auth: DropboxAuth | null = null;

    private currentProfile: string = 'Default';

    constructor() {
        // Try to restore session
        const savedToken = localStorage.getItem('dropbox_token');
        const savedRefreshToken = localStorage.getItem('dropbox_refresh_token');

        if (savedToken) {
            if (savedRefreshToken) {
                this.dbx = new Dropbox({
                    accessToken: savedToken,
                    refreshToken: savedRefreshToken,
                    clientId: CLIENT_ID,
                });
            } else {
                this.dbx = new Dropbox({ accessToken: savedToken });
            }
        }
    }

    // Step 1: Initialize Auth with User's App Key
    initializeAuth(clientId: string = CLIENT_ID) {
        this.auth = new DropboxAuth({
            clientId: clientId,
        });
    }

    // Step 2: Get Auth URL
    async getAuthUrl(): Promise<string> {
        if (!this.auth) throw new Error('Auth not initialized. Set Client ID first.');

        // Generates a random code verifier and challenge
        const authUrl = await this.auth.getAuthenticationUrl(
            REDIRECT_URI,
            undefined, // state
            'code', // authType
            'offline', // tokenAccessType (offline = allow refresh tokens if supported/configured)
            ['files.content.read', 'files.content.write'], // scope
            undefined, // includeGrantedScopes
            true // usePKCE
        );

        // Manually save the code verifier to ensure persistence across redirect
        const verifier = this.auth.getCodeVerifier();
        if (verifier) {
            window.sessionStorage.setItem('dropbox_code_verifier', verifier);
        }

        return authUrl as any as string;
    }

    // Step 3: Handle Redirect and Exchange Code for Token
    async handleRedirect(): Promise<boolean> {
        // We need to reinstantiate DropboxAuth to access the stored codeverifier
        // Using hardcoded CLIENT_ID
        const storedClientId = CLIENT_ID;

        this.initializeAuth(storedClientId);
        if (!this.auth) return false;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            try {
                // Restore code verifier from session storage
                const verifier = window.sessionStorage.getItem('dropbox_code_verifier');
                if (verifier) {
                    this.auth.setCodeVerifier(verifier);
                } else {
                    console.warn('Code verifier missing from session storage (key: dropbox_code_verifier)');
                }

                const response = await this.auth.getAccessTokenFromCode(REDIRECT_URI, code);
                const result = response.result as any; // Type assertion for safety

                const accessToken = result.access_token;
                const refreshToken = result.refresh_token;

                this.setAccessToken(accessToken, refreshToken);

                // Save for persistence
                localStorage.setItem('dropbox_token', accessToken);
                if (refreshToken) localStorage.setItem('dropbox_refresh_token', refreshToken);

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return true;
            } catch (error: any) {
                console.error('Auth error full object:', error);

                let errorMessage = '未知錯誤';
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                } else {
                    // Try to see if it has response property (common in SDK)
                    errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
                }

                alert(`登入錯誤詳細資訊:\n${errorMessage}\n\n請檢查 Console (F12) 的 Redirect URI 是否與 Dropbox 後台設定完全一致(包含斜線)。`);
                return false;
            }
        }
        return false;
    }

    setAccessToken(token: string, refreshToken?: string) {
        if (refreshToken) {
            this.dbx = new Dropbox({
                accessToken: token,
                refreshToken: refreshToken,
                clientId: CLIENT_ID,
            });
        } else {
            this.dbx = new Dropbox({ accessToken: token });
        }
    }

    isAuthenticated(): boolean {
        return !!this.dbx;
    }

    async logout() {
        if (this.dbx) {
            try {
                await this.dbx.authTokenRevoke();
            } catch (error) {
                console.warn('Token revocation failed (maybe already expired):', error);
            }
        }
        this.dbx = null;
        this.auth = null;
        localStorage.removeItem('dropbox_token');
        localStorage.removeItem('dropbox_refresh_token');
    }

    // --- Profile Management ---

    setProfile(profileName: string) {
        this.currentProfile = profileName;
        console.log(`Switched to profile: ${profileName}`);
    }

    getProfile(): string {
        return this.currentProfile;
    }

    private getPath(filename: string): string {
        // Remove leading slash for cleaner joining if present
        const cleanName = filename.startsWith('/') ? filename.substring(1) : filename;

        if (this.currentProfile === 'Default') {
            return '/' + cleanName;
        } else {
            return `/profiles/${this.currentProfile}/${cleanName}`;
        }
    }

    async getProfiles(): Promise<string[]> {
        if (!this.dbx) return ['Default'];
        try {
            const data = await this.downloadFile<{ profiles: string[] }>('/profiles.json', true);
            return data && data.profiles ? data.profiles : ['Default'];
        } catch (error) {
            // If file doesn't exist, assume only Default exists
            return ['Default'];
        }
    }

    async addProfile(name: string): Promise<void> {
        const profiles = await this.getProfiles();
        if (!profiles.includes(name)) {
            const newProfiles = [...profiles, name];
            await this.uploadFile({ profiles: newProfiles }, '/profiles.json', true);
        }
    }

    async renameProfile(oldName: string, newName: string): Promise<void> {
        if (!this.dbx) throw new Error('Not authenticated');
        if (oldName === 'Default') throw new Error('Cannot rename Default profile');

        const profiles = await this.getProfiles();
        if (profiles.includes(newName)) throw new Error('Profile name already exists');

        // 1. Update profiles.json first to secure the new name
        const newProfiles = profiles.map(p => p === oldName ? newName : p);
        await this.uploadFile({ profiles: newProfiles }, '/profiles.json', true);

        // 2. Move Folder
        // Only move if old folder exists. 
        // If it was a fresh profile with no data, folder might not exist yet, which is fine.
        const oldPath = `/profiles/${oldName}`;
        const newPath = `/profiles/${newName}`;

        try {
            await this.dbx.filesMoveV2({ from_path: oldPath, to_path: newPath });
        } catch (error: any) {
            // If old folder not found, nothing to move. 
            // If destination exists (shouldn't happen if we checked profiles, but maybe race condition), we might have an issue.
            // But mainly we care about "path_not_found" for source.
            console.log('Rename folder warning:', error);
        }

        // 3. Update current profile state
        if (this.currentProfile === oldName) {
            this.currentProfile = newName;
        }
    }

    async deleteProfile(name: string): Promise<void> {
        if (!this.dbx) throw new Error('Not authenticated');
        if (name === 'Default') throw new Error('Cannot delete Default profile');

        // 1. Delete Folder
        try {
            await this.dbx.filesDeleteV2({ path: `/profiles/${name}` });
        } catch (error: any) {
            // Ignore not found
            console.log('Delete folder warning:', error);
        }

        // 2. Update profiles.json
        const profiles = await this.getProfiles();
        const newProfiles = profiles.filter(p => p !== name);
        await this.uploadFile({ profiles: newProfiles }, '/profiles.json', true);

        // 3. Reset state
        if (this.currentProfile === name) {
            this.currentProfile = 'Default';
        }
    }

    // --- File Operations ---

    async checkFileExists(filename: string, isAbsolute: boolean = false): Promise<boolean> {
        if (!this.dbx) return false;
        const path = isAbsolute ? filename : this.getPath(filename);
        try {
            await this.dbx.filesGetMetadata({ path });
            return true;
        } catch (error: any) {
            // Check for specific "path not found" error
            const errorData = error.error || {};
            const tag = errorData['.tag'] || (errorData.path_lookup ? errorData.path_lookup['.tag'] : null);

            if (tag === 'path_not_found' || JSON.stringify(error).includes('path_not_found')) {
                return false;
            }

            // If it's not a "not found" error, it might be network or auth error.
            console.error('Check file exists failed with unexpected error:', error);
            throw error;
        }
    }

    async uploadFile(data: any, filename: string, isAbsolute: boolean = false): Promise<void> {
        if (!this.dbx) throw new Error('Not authenticated');
        const path = isAbsolute ? filename : this.getPath(filename);
        const fileContent = JSON.stringify(data, null, 2);

        await this.dbx.filesUpload({
            path,
            contents: fileContent,
            mode: { '.tag': 'overwrite' }
        });
    }

    async downloadFile<T>(filename: string, isAbsolute: boolean = false): Promise<T | null> {
        if (!this.dbx) throw new Error('Not authenticated');
        const path = isAbsolute ? filename : this.getPath(filename);

        try {
            const response = await this.dbx.filesDownload({ path });
            const result = response.result as any;
            const fileBlob = result.fileBlob ? result.fileBlob : result.fileBinary;

            if (fileBlob) {
                const text = await (fileBlob as Blob).text();
                return JSON.parse(text) as T;
            }
            return null;
        } catch (error: any) {
            const str = JSON.stringify(error);
            if (str.includes('path_not_found')) return null;

            console.error('Download error type:', typeof error);
            // Rethrow if not a simple not found
            throw error;
        }
    }

    // Settings Operations
    async loadSettings(): Promise<AppSettings | null> {
        return this.downloadFile<AppSettings>('settings.json');
    }

    async saveSettings(settings: AppSettings): Promise<void> {
        return this.uploadFile(settings, 'settings.json');
    }
}

export const dropboxService = new DropboxService();
