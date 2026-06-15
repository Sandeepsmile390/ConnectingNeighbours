import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListResources, useCreateResource, useDeleteResource, getListResourcesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { formatDistanceToNow } from "date-fns";
import { HeartHandshake, Plus, Car, Hammer, Baby, Box, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["ride", "item", "service", "childcare"]),
});

export default function Resources() {
  const [typeFilter, setTypeFilter] = useState<"ride" | "item" | "service" | "childcare" | "all">("all");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = typeFilter !== "all" ? { type: typeFilter } : {};
  const { data: resources, isLoading } = useListResources(queryParams, { query: { queryKey: getListResourcesQueryKey(queryParams) } });
  
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "item",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createResource.mutate({ data }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
        toast({ title: "Resource offered successfully" });
      },
      onError: () => {
        toast({ title: "Failed to offer resource", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteResource.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
        toast({ title: "Resource removed" });
      }
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ride': return <Car className="h-4 w-4" />;
      case 'service': return <Hammer className="h-4 w-4" />;
      case 'childcare': return <Baby className="h-4 w-4" />;
      default: return <Box className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-teal-50/50 dark:bg-teal-950/10 p-6 rounded-2xl border border-teal-100 dark:border-teal-900/30">
        <div className="flex gap-4 items-start sm:items-center">
          <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
            <HeartHandshake className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-teal-900 dark:text-teal-300">Shared Resources</h1>
            <p className="text-teal-700/80 dark:text-teal-400/80 text-sm mt-1">Lend a hand or borrow what you need from neighbors.</p>
          </div>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white shrink-0">
              <Plus className="h-4 w-4" />
              Offer Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Offer a Resource</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resource Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="item">Borrow an Item (Tools, Books)</SelectItem>
                          <SelectItem value="ride">Carpool / Ride Share</SelectItem>
                          <SelectItem value="service">Skill / Service</SelectItem>
                          <SelectItem value="childcare">Childcare / Pet sitting</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Power Drill, Weekend Rides to Station" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain what you're offering, availability, and how neighbors can reach out." 
                          className="min-h-[100px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={createResource.isPending}>
                  {createResource.isPending ? "Posting..." : "Offer Resource"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setTypeFilter(v as any)} className="w-full">
        <TabsList className="mb-6 bg-teal-50 dark:bg-teal-950/20">
          <TabsTrigger value="all" className="data-[state=active]:bg-teal-100 data-[state=active]:text-teal-900 dark:data-[state=active]:bg-teal-900/50 dark:data-[state=active]:text-teal-100">All</TabsTrigger>
          <TabsTrigger value="item" className="data-[state=active]:bg-teal-100 data-[state=active]:text-teal-900 dark:data-[state=active]:bg-teal-900/50 dark:data-[state=active]:text-teal-100">Items</TabsTrigger>
          <TabsTrigger value="service" className="data-[state=active]:bg-teal-100 data-[state=active]:text-teal-900 dark:data-[state=active]:bg-teal-900/50 dark:data-[state=active]:text-teal-100">Services</TabsTrigger>
          <TabsTrigger value="ride" className="data-[state=active]:bg-teal-100 data-[state=active]:text-teal-900 dark:data-[state=active]:bg-teal-900/50 dark:data-[state=active]:text-teal-100">Rides</TabsTrigger>
          <TabsTrigger value="childcare" className="data-[state=active]:bg-teal-100 data-[state=active]:text-teal-900 dark:data-[state=active]:bg-teal-900/50 dark:data-[state=active]:text-teal-100">Care</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/30" />
                <CardContent className="h-20" />
              </Card>
            ))
          ) : resources?.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-muted/10 rounded-xl border border-dashed">
              <HeartHandshake className="h-12 w-12 mx-auto text-teal-500 opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-teal-700 dark:text-teal-400">No resources shared yet</h3>
              <p className="text-muted-foreground mt-1">Be the first to offer something to the neighborhood.</p>
            </div>
          ) : (
            resources?.map((resource) => (
              <Card key={resource.id} className="overflow-hidden hover:border-teal-200 dark:hover:border-teal-800 transition-colors group">
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform">
                      {getTypeIcon(resource.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg line-clamp-1">{resource.title}</h3>
                      <Badge variant="secondary" className="mt-1 capitalize text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 font-normal">
                        {resource.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 flex-1">
                  <p className="text-sm line-clamp-3 text-muted-foreground">{resource.description}</p>
                </CardContent>
                <CardFooter className="px-5 py-3 bg-muted/5 border-t flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={resource.offerer.avatarUrl || undefined} />
                      <AvatarFallback>{resource.offerer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{resource.offerer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(resource.createdAt))} ago</span>
                    {user?.id === resource.offererId && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive ml-1" onClick={() => handleDelete(resource.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </Tabs>
    </div>
  );
}
