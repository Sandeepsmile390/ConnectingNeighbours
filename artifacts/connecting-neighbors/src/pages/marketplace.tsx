import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListListings, useCreateListing, useDeleteListing, getListListingsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2, Tag, ShoppingCart, Gift, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const listingCategories = [
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "clothing", label: "Clothing" },
  { value: "books", label: "Books" },
  { value: "groceries", label: "Groceries" },
  { value: "appliances", label: "Appliances" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["sell", "free", "rent"]),
  category: z.enum(["electronics", "furniture", "clothing", "books", "groceries", "appliances", "other"]),
  price: z.coerce.number().optional(),
});

export default function Marketplace() {
  const [typeFilter, setTypeFilter] = useState<"sell" | "free" | "rent" | "all">("all");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = typeFilter !== "all" ? { type: typeFilter } : {};
  const { data: listings, isLoading } = useListListings(queryParams, { query: { queryKey: getListListingsQueryKey(queryParams) } });
  
  const createListing = useCreateListing();
  const deleteListing = useDeleteListing();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "sell",
      category: "other",
      price: undefined,
    },
  });

  const watchType = form.watch("type");

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createListing.mutate({ data }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListListingsQueryKey() });
        toast({ title: "Listing created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create listing", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteListing.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListListingsQueryKey() });
        toast({ title: "Listing deleted" });
      }
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sell': return <Tag className="h-3 w-3" />;
      case 'free': return <Gift className="h-3 w-3" />;
      case 'rent': return <Clock className="h-3 w-3" />;
      default: return <ShoppingCart className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sell': return "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case 'free': return "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400";
      case 'rent': return "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400";
      default: return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Neighborhood Market</h1>
          <p className="text-muted-foreground">Buy, sell, rent, or give away items locally.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              List an Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create a Listing</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sell">For Sale</SelectItem>
                            <SelectItem value="free">For Free</SelectItem>
                            <SelectItem value="rent">For Rent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {listingCategories.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="What are you offering?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchType !== "free" && (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price {watchType === "rent" ? "(per day/week)" : ""}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input type="number" className="pl-7" placeholder="0.00" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide details about the item's condition, dimensions, pickup availability, etc." 
                          className="min-h-[100px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={createListing.isPending}>
                  {createListing.isPending ? "Creating..." : "Publish Listing"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setTypeFilter(v as any)} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="sell">For Sale</TabsTrigger>
          <TabsTrigger value="free">For Free</TabsTrigger>
          <TabsTrigger value="rent">For Rent</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted/50 rounded-t-xl" />
                <CardContent className="h-32 mt-4" />
              </Card>
            ))
          ) : listings?.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-muted/20 rounded-xl border border-dashed">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium">No listings found</h3>
              <p className="text-muted-foreground mt-1">There are no items matching this filter right now.</p>
            </div>
          ) : (
            listings?.map((listing) => (
              <Card key={listing.id} className="overflow-hidden flex flex-col hover:border-primary/30 transition-colors">
                <div className="h-48 bg-muted/30 flex items-center justify-center border-b relative">
                  {listing.imageUrl ? (
                    <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  <Badge className={`absolute top-3 right-3 gap-1 font-medium border-none shadow-sm ${getTypeColor(listing.type)}`}>
                    {getTypeIcon(listing.type)}
                    {listing.type === 'free' ? 'FREE' : listing.type.toUpperCase()}
                  </Badge>
                </div>
                <CardHeader className="p-4 pb-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg line-clamp-1 flex-1">{listing.title}</h3>
                    {listing.type !== 'free' && listing.price != null && (
                      <span className="font-bold text-lg ml-2 whitespace-nowrap">${listing.price}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">{listing.category}</p>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex-1">
                  <p className="text-sm line-clamp-3 text-muted-foreground">{listing.description}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between items-center bg-muted/5 rounded-b-xl border-t mt-auto">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={listing.seller.avatarUrl || undefined} />
                      <AvatarFallback>{listing.seller.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{listing.seller.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(listing.createdAt))} ago</span>
                    {user?.id === listing.sellerId && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive ml-1" onClick={() => handleDelete(listing.id)}>
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
