import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Bell, User } from "lucide-react"

export function Header() {
    return (
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        type="search"
                        placeholder="Buscar paciente, historia clínica..."
                        className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-500">
                    <Bell className="h-5 w-5" />
                </Button>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <Button variant="ghost" className="gap-2 pl-2 pr-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        <User className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start text-sm">
                        <span className="font-medium">Dr. Pineda</span>
                        <span className="text-xs text-muted-foreground">Admin</span>
                    </div>
                </Button>
            </div>
        </header>
    )
}
