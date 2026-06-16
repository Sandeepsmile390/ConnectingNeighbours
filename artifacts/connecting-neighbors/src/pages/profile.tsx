import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useUpdateUser, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User as UserIcon, Twitter, Facebook, Linkedin, Instagram, Github, ShieldAlert } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  apartment: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().max(160, "Bio must be less than 160 characters").optional(),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  twitterUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  facebookUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  instagramUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

export default function Profile() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateUser = useUpdateUser();

  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);

  const handleBecomeAdmin = async () => {
    if (!adminPassword) {
      setAdminError("Please enter the admin password.");
      return;
    }
    setIsPromoting(true);
    setAdminError("");
    try {
      const res = await fetch("/api/auth/promote-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "You have been promoted to colony administrator." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setAdminPassword("");
      } else {
        const data = await res.json();
        setAdminError(data.error || "Failed to verify password.");
      }
    } catch {
      setAdminError("An error occurred during promotion.");
    } finally {
      setIsPromoting(false);
    }
  };

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      apartment: "",
      phone: "",
      bio: "",
      avatarUrl: "",
      twitterUrl: "",
      facebookUrl: "",
      linkedinUrl: "",
      instagramUrl: "",
      githubUrl: "",
    },
  });

  // Init form with user data safely
  const initialized = useRef(false);
  useEffect(() => {
    if (user && !initialized.current) {
      form.reset({
        name: user.name,
        apartment: user.apartment || "",
        phone: user.phone || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
        twitterUrl: user.twitterUrl || "",
        facebookUrl: user.facebookUrl || "",
        linkedinUrl: user.linkedinUrl || "",
        instagramUrl: user.instagramUrl || "",
        githubUrl: user.githubUrl || "",
      });
      initialized.current = true;
    }
  }, [user, form]);

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    if (!user) return;
    
    updateUser.mutate({ id: user.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Profile updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Manage your neighborhood presence.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Information</CardTitle>
          <CardDescription>This is how other neighbors will see you in the directory.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                <AvatarImage src={form.watch("avatarUrl") || undefined} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {form.watch("name")?.charAt(0) || <UserIcon className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs text-center text-muted-foreground max-w-[150px]">
                Enter an image URL in the form to update your avatar.
              </div>
            </div>

            <div className="flex-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apartment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apartment / House #</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 4B, 102" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Me</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Share a little about yourself, your pets, or your interests." 
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="For emergency contacts only" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avatarUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Social Profiles Grid */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-foreground">Social Profiles</h3>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="twitterUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-xs">
                              <Twitter className="h-3.5 w-3.5 text-sky-500" />
                              Twitter / X URL
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://x.com/username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="facebookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-xs">
                              <Facebook className="h-3.5 w-3.5 text-blue-600" />
                              Facebook URL
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://facebook.com/username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="linkedinUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-xs">
                              <Linkedin className="h-3.5 w-3.5 text-blue-700" />
                              LinkedIn URL
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://linkedin.com/in/username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagramUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-xs">
                              <Instagram className="h-3.5 w-3.5 text-pink-600" />
                              Instagram URL
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://instagram.com/username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="githubUrl"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="flex items-center gap-1.5 text-xs">
                              <Github className="h-3.5 w-3.5 text-foreground" />
                              GitHub URL
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://github.com/username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between items-center">
                    <Button type="submit" disabled={updateUser.isPending}>
                      {updateUser.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    
                    <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => logout()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>

      {!user.isColonyAdmin && (
        <Card className="border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2 text-lg font-bold">
              <ShieldAlert className="h-5 w-5" />
              Become Colony Admin
            </CardTitle>
            <CardDescription>
              Enter the administrator password to elevate your account to a Colony Admin role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 max-w-md">
              <Input
                type="password"
                placeholder="Enter Admin Password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAdminError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleBecomeAdmin();
                }}
              />
              <Button 
                onClick={handleBecomeAdmin} 
                disabled={isPromoting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold min-w-[120px]"
              >
                {isPromoting ? "Promoting..." : "Verify & Enable"}
              </Button>
            </div>
            {adminError && <p className="text-xs text-destructive font-medium">{adminError}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
