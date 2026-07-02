// Global variables to store user IDs
let adminUserId: string | null = null;

import { getUserIdByEmail } from "./utils.js";

/**
 * Gets the admin user ID by looking up the user by email or username
 *
 * This function will try the following methods in order:
 * 1. Use the cached admin user ID if available
 * 2. Use the PLANKA_ADMIN_ID environment variable if set (for backwards compatibility)
 * 3. Look up the admin user ID by email using PLANKA_ADMIN_EMAIL
 * 4. Look up the admin user ID by username using PLANKA_ADMIN_USERNAME
 */
export async function getAdminUserId(): Promise<string | null> {
    if (adminUserId) {
        return adminUserId;
    }

    try {
        // Check for direct admin ID (for backwards compatibility)
        const directAdminId = process.env.PLANKA_ADMIN_ID;
        if (directAdminId) {
            adminUserId = directAdminId;
            return adminUserId;
        }

        // Try to get the admin ID by email
        const adminEmail = process.env.PLANKA_ADMIN_EMAIL;
        if (adminEmail) {
            const id = await getUserIdByEmail(adminEmail);
            if (id) {
                adminUserId = id;
                return adminUserId;
            }
        }

        // Fallback to agent email
        const agentEmail = process.env.PLANKA_AGENT_EMAIL;
        if (agentEmail) {
            const id = await getUserIdByEmail(agentEmail);
            if (id) {
                adminUserId = id;
                return adminUserId;
            }
        }

        console.error(
            "Could not determine admin user ID. Please set PLANKA_ADMIN_ID, PLANKA_ADMIN_EMAIL, PLANKA_ADMIN_USERNAME, or PLANKA_AGENT_EMAIL.",
        );
        return null;
    } catch (error) {
        console.error("Failed to get admin user ID:", error);
        return null;
    }
}
