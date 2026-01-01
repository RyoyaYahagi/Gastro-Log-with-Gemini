import { useUser, useClerk } from '@clerk/clerk-react'

interface AuthContextType {
    user: {
        id: string
        name: string | null
        email: string | null
    } | null
    isLoading: boolean
    signInWithGoogle: () => void
    signOut: () => Promise<void>
    getToken: () => Promise<string | null>
}

export function useAuth(): AuthContextType {
    const { user, isLoaded } = useUser()
    const { openSignIn, signOut, session } = useClerk()

    const signInWithGoogle = () => {
        openSignIn()
    }

    const handleSignOut = async () => {
        await signOut()
    }

    return {
        user: user
            ? {
                id: user.id,
                name: user.fullName || user.firstName || null,
                email: user.primaryEmailAddress?.emailAddress || null,
            }
            : null,
        isLoading: !isLoaded,
        signInWithGoogle,
        signOut: handleSignOut,
        getToken: async () => {
            return session ? await session.getToken() : null
        }
    }
}
