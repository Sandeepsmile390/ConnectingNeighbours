import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPosts, useCreatePost, useLikePost, useDeletePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, Trash2, Plus } from "lucide-react";
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

const postCategories = [
  { value: "general", label: "General" },
  { value: "announcement", label: "Announcement" },
  { value: "helpNeeded", label: "Help Needed" },
  { value: "lostFound", label: "Lost & Found" },
  { value: "recommendation", label: "Recommendation" },
  { value: "safety", label: "Safety" },
];

const formSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  category: z.enum(["general", "announcement", "helpNeeded", "lostFound", "recommendation", "safety"]),
});

export default function Feed() {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = filter !== "all" ? { category: filter } : {};
  const { data: posts, isLoading } = useListPosts(queryParams, { query: { queryKey: getListPostsQueryKey(queryParams) } });
  
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const deletePost = useDeletePost();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "general",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createPost.mutate({ data }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        toast({ title: "Post created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create post", variant: "destructive" });
      }
    });
  };

  const handleLike = (id: number) => {
    likePost.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deletePost.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        toast({ title: "Post deleted" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community Feed</h1>
          <p className="text-muted-foreground">See what your neighbors are talking about.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create a Post</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {postCategories.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
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
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Give your post a title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What do you want to share with the neighborhood?" 
                          className="min-h-[120px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createPost.isPending}>
                  {createPost.isPending ? "Posting..." : "Post to Feed"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button 
          variant={filter === "all" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setFilter("all")}
          className="rounded-full whitespace-nowrap"
        >
          All Posts
        </Button>
        {postCategories.map((cat) => (
          <Button
            key={cat.value}
            variant={filter === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(cat.value)}
            className="rounded-full whitespace-nowrap"
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted/50 rounded-t-xl" />
              <CardContent className="h-32" />
            </Card>
          ))
        ) : posts?.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No posts found</h3>
            <p className="text-muted-foreground mt-1">Be the first to post in this category.</p>
          </div>
        ) : (
          posts?.map((post) => (
            <Card key={post.id} className="overflow-hidden hover-elevate transition-shadow">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-5">
                <Avatar>
                  <AvatarImage src={post.author.avatarUrl || undefined} />
                  <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold truncate">{post.author.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {post.author.apartment && <span>• {post.author.apartment}</span>}
                        <span>• {formatDistanceToNow(new Date(post.createdAt))} ago</span>
                      </span>
                    </div>
                    {user?.id === post.authorId && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive -mr-2" onClick={() => handleDelete(post.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {post.title && <h3 className="font-medium text-lg mt-1">{post.title}</h3>}
                  <Badge variant="secondary" className="mt-2 capitalize bg-primary/10 text-primary hover:bg-primary/20 font-medium">
                    {post.category.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-0">
                <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
              </CardContent>
              <CardFooter className="px-5 py-3 border-t bg-muted/10 gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-2 ${post.isLikedByMe ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50' : 'text-muted-foreground'}`}
                  onClick={() => handleLike(post.id)}
                >
                  <Heart className={`h-4 w-4 ${post.isLikedByMe ? 'fill-current' : ''}`} />
                  {post.likesCount}
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground cursor-default hover:bg-transparent">
                  <MessageSquare className="h-4 w-4" />
                  {post.commentsCount}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
