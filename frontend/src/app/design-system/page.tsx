"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DesignSystemPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 p-8 space-y-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Design System Showcase</h1>
                    <p className="text-gray-500">Atomic components verification for Desktop-First UI</p>
                </div>

                {/* Buttons */}
                <Card>
                    <CardHeader>
                        <CardTitle>Buttons</CardTitle>
                        <CardDescription>Variants and sizes for primary interactions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <Button>Default</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="link">Link</Button>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                            <Button size="sm">Small</Button>
                            <Button size="default">Default</Button>
                            <Button size="lg">Large</Button>
                            <Button size="icon">🔔</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Badges */}
                <Card>
                    <CardHeader>
                        <CardTitle>Badges & Status</CardTitle>
                        <CardDescription>Semantic indicators for clinical status.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        <Badge>Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="destructive">Critical</Badge>
                        <Badge variant="outline">Outline</Badge>
                        <Badge variant="high">High Allergy</Badge>
                        <Badge variant="warning">Warning</Badge>
                        <Badge variant="success">Active</Badge>
                    </CardContent>
                </Card>

                {/* Inputs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Inputs</CardTitle>
                        <CardDescription>Form controls with focus states.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 max-w-sm">
                        <Input placeholder="Default input..." />
                        <Input placeholder="Disabled input..." disabled />
                    </CardContent>
                </Card>

                {/* Dialogs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dialogs</CardTitle>
                        <CardDescription>Modal windows for focused tasks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">Open Dialog</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Edit Profile</DialogTitle>
                                    <DialogDescription>
                                        Make changes to your profile here. Click save when you're done.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <label className="text-right text-sm">Name</label>
                                        <Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Save changes</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

                {/* Toasts */}
                <Card>
                    <CardHeader>
                        <CardTitle>Toasts</CardTitle>
                        <CardDescription>Transient notifications.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                toast({
                                    title: "Scheduled: Appointment",
                                    description: "Friday, February 10, 2024 at 5:57 PM",
                                });
                            }}
                        >
                            Show Toast
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                toast({
                                    variant: "destructive",
                                    title: "Uh oh! Something went wrong.",
                                    description: "There was a problem with your request.",
                                });
                            }}
                        >
                            Show Error
                        </Button>
                        <Button
                            variant="default" // Using default as proxy for success if variant not strictly typed in demo
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                                toast({
                                    variant: "success",
                                    title: "Patient Saved",
                                    description: "Record updated successfully.",
                                });
                            }}
                        >
                            Show Success
                        </Button>
                    </CardContent>
                </Card>

                {/* Skeletons */}
                <Card>
                    <CardHeader>
                        <CardTitle>Loading States</CardTitle>
                        <CardDescription>Skeleton loaders for async content.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[300px]" />
                    </CardContent>
                </Card>

                {/* App Shell Layout Preview */}
                <Card className="col-span-full mt-8">
                    <CardHeader>
                        <CardTitle>App Shell Layout</CardTitle>
                        <CardDescription>Sidebar and Header composition (Mockup).</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[600px] border rounded-md overflow-hidden flex bg-gray-100 p-0 relative isolate">
                        <div className="h-full bg-white z-10 w-64 flex-shrink-0 border-r relative flex flex-col">
                            <Sidebar className="h-full border-none w-full" />
                        </div>
                        <div className="flex-1 flex flex-col overflow-hidden h-full relative bg-gray-50">
                            <div className="h-16 border-b bg-white flex items-center w-full px-0 relative z-10">
                                {/* Header wraps itself, we just need container */}
                                <div className="w-full">
                                    <Header />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">Dashboard Area</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="h-32 rounded-lg bg-white border shadow-sm p-4 animate-pulse flex items-center justify-center text-gray-400">Stats Card</div>
                                    <div className="h-32 rounded-lg bg-white border shadow-sm p-4 animate-pulse flex items-center justify-center text-gray-400">Activity Card</div>
                                    <div className="h-32 rounded-lg bg-white border shadow-sm p-4 animate-pulse flex items-center justify-center text-gray-400">Status Card</div>
                                    <div className="h-64 col-span-full rounded-lg bg-white border shadow-sm p-4 animate-pulse flex items-center justify-center text-gray-400">Chart Area</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
            <Toaster />
        </div>
    );
}
