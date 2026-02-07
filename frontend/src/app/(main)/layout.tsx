import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Sidebar - Desktop Only for now */}
            <aside className="hidden md:flex flex-col border-r bg-white h-full z-20">
                <Sidebar className="h-full border-none" />
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />

                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
