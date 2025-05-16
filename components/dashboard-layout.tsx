"use client"

import Link from "next/link"
import Image from "next/image"
import { type ReactNode, useState } from "react"
import { BarChart3, FileText, Home, LogOut, Menu, Settings, Users, X, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignOutButton, useUser } from '@clerk/nextjs'
import { Badge } from "@/components/ui/badge"
import { useIsAdmin } from "./admin-check"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useUser();
  const { isAdmin } = useIsAdmin();
  const [logoSrc, setLogoSrc] = useState("/evergreen.png");
  
  const navItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "Proposals", href: "/proposals" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  // Add admin item to navigation items if user is admin
  const displayNavItems = isAdmin 
    ? [...navItems, { icon: Shield, label: "Admin", href: "/admin" }] 
    : navItems;
  
  // Handle logo loading error
  const handleLogoError = () => {
    // Fallback to logo.jpeg if evergreen.png fails to load
    setLogoSrc("/logo.jpeg");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-40">
        <div className="relative flex justify-end items-center px-4 py-3">
          {/* Logo and title position at extreme left */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 flex items-center z-10">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden ml-1">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <Image 
                        src={logoSrc}
                        alt="Evergreen Energy Upgrades Logo" 
                        width={120}
                        height={48}
                        className="h-12 w-auto object-contain"
                        priority
                        onError={handleLogoError}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <nav className="space-y-1">
                    {displayNavItems.map((item, index) => (
                      <Link
                        key={index}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="flex items-center">
              <div className="flex items-center">
                <Image 
                  src={logoSrc}
                  alt="Evergreen Energy Upgrades Logo" 
                  width={140}
                  height={56}
                  className="h-14 w-auto object-contain"
                  priority
                  onError={handleLogoError}
                />
                <span className="text-lg font-semibold text-gray-800 ml-2 hidden sm:inline-block">EverGreen Proposals</span>
              </div>
            </Link>
          </div>

          {/* Main header content aligned right */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full p-0 h-9 w-9 overflow-hidden">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                    <AvatarImage src={user?.imageUrl || "/placeholder-user.jpg"} alt={user?.fullName || "User"} />
                    <AvatarFallback className="bg-rose-100 text-rose-800">
                      {user?.firstName?.[0]}{user?.lastName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1">
                <DropdownMenuLabel className="flex items-center gap-3 p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.imageUrl || "/placeholder-user.jpg"} alt={user?.fullName || "User"} />
                    <AvatarFallback className="bg-rose-100 text-rose-800">
                      {user?.firstName?.[0]}{user?.lastName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{user?.fullName || "User"}</span>
                    <span className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress || ""}</span>
                    {isAdmin && (
                      <Badge className="mt-1 bg-rose-600 text-xs">Administrator</Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <Link href="/admin">
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                <Link href="/settings">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
                <SignOutButton>
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:block w-64 border-r bg-white">
          <div className="p-6 space-y-1">
            {displayNavItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <item.icon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-50">
          <div className="container mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
