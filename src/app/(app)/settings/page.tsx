
"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Laptop, Palette, Bell, UserCircle, Languages } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using theme, to avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null; // or a loading skeleton
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold flex items-center">
          <Palette className="mr-3 h-8 w-8 text-primary" />
          Settings
        </h1>
      </div>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="mr-2 h-6 w-6 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="theme-group" className="text-base font-medium mb-2 block">Theme</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select your preferred color scheme. Current: <span className="font-semibold capitalize">{resolvedTheme}</span>
            </p>
            <RadioGroup
              id="theme-group"
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Laptop },
              ].map((item) => (
                <Label
                  key={item.value}
                  htmlFor={`theme-${item.value}`}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                    theme === item.value ? "border-primary bg-primary/10" : "border-muted"
                  )}
                >
                  <RadioGroupItem value={item.value} id={`theme-${item.value}`} className="sr-only" />
                  <item.icon className={cn("h-8 w-8 mb-2", theme === item.value ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-6 w-6 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>Manage your notification preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div>
              <Label htmlFor="email-notifications" className="text-base font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive important updates via email.</p>
            </div>
            <Switch id="email-notifications" disabled />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div>
              <Label htmlFor="in-app-notifications" className="text-base font-medium">In-app Notifications</Label>
              <p className="text-sm text-muted-foreground">Get notified directly within the app.</p>
            </div>
            <Switch id="in-app-notifications" checked disabled />
          </div>
           <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div>
              <Label htmlFor="push-notifications" className="text-base font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Get real-time alerts on your device (if supported).</p>
            </div>
            <Switch id="push-notifications" disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCircle className="mr-2 h-6 w-6 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <Label htmlFor="user-profile" className="text-base font-medium mb-2 block">User Profile</Label>
            <p className="text-sm text-muted-foreground mb-3">View and manage your profile information.</p>
            <Button variant="outline" disabled>View Profile (Coming Soon)</Button>
          </div>
          <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <Label htmlFor="language-select" className="text-base font-medium mb-2 block">Language</Label>
             <p className="text-sm text-muted-foreground mb-3">Choose your preferred language for the application.</p>
            <Select defaultValue="en" disabled>
              <SelectTrigger id="language-select" className="w-full md:w-[200px]">
                <SelectValue placeholder="Select language..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es" disabled>Español (Coming Soon)</SelectItem>
                <SelectItem value="fr" disabled>Français (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <Label className="text-base font-medium mb-2 block">Security</Label>
             <p className="text-sm text-muted-foreground mb-3">Manage your account security settings.</p>
            <Button variant="outline" disabled>Change Password (Coming Soon)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper for cn, if not already globally available or imported
// (Typically from '@/lib/utils')
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
