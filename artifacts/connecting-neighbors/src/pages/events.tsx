import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEvents, useCreateEvent, useRsvpEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Users, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  startsAt: z.string().min(1, "Start time is required"),
  endsAt: z.string().optional(),
});

export default function Events() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useListEvents({ query: { queryKey: getListEventsQueryKey() } });
  
  const createEvent = useCreateEvent();
  const rsvpEvent = useRsvpEvent();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      startsAt: "",
      endsAt: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Format dates to ISO strings if needed
    const formattedData = {
      ...data,
      startsAt: new Date(data.startsAt).toISOString(),
      endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined
    };

    createEvent.mutate({ data: formattedData }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "Event created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create event", variant: "destructive" });
      }
    });
  };

  const handleRsvp = (id: number, currentRsvp: boolean) => {
    rsvpEvent.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: currentRsvp ? "RSVP cancelled" : "RSVP confirmed" });
      }
    });
  };

  const getEventStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return <Badge variant="outline" className="bg-muted">Past</Badge>;
    if (isToday(date)) return <Badge className="bg-orange-500 hover:bg-orange-600">Today</Badge>;
    if (isTomorrow(date)) return <Badge className="bg-blue-500 hover:bg-blue-600">Tomorrow</Badge>;
    return <Badge variant="secondary" className="bg-primary/10 text-primary">Upcoming</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community Events</h1>
          <p className="text-muted-foreground">Gatherings, meetings, and celebrations in the neighborhood.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Host Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Host a Community Event</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Block Party, HOA Meeting, Yoga in the Park" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Where is it happening?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startsAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endsAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What should neighbors know about this event?" 
                          className="min-h-[100px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={createEvent.isPending}>
                  {createEvent.isPending ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted/30" />
              <CardContent className="h-20" />
            </Card>
          ))
        ) : events?.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-muted/20 rounded-xl border border-dashed">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No upcoming events</h3>
            <p className="text-muted-foreground mt-1">Why not host one yourself?</p>
          </div>
        ) : (
          events?.map((event) => {
            const startDate = new Date(event.startsAt);
            const isEventPast = isPast(startDate) && !isToday(startDate);
            
            return (
              <Card key={event.id} className={`overflow-hidden transition-all ${isEventPast ? 'opacity-70' : 'hover-elevate hover:border-primary/30'}`}>
                <div className="flex border-b border-border/50">
                  <div className="w-24 bg-primary/5 flex flex-col items-center justify-center p-4 border-r border-border/50 text-center">
                    <span className="text-sm font-semibold text-primary uppercase">{format(startDate, 'MMM')}</span>
                    <span className="text-3xl font-bold text-foreground">{format(startDate, 'd')}</span>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-lg line-clamp-1">{event.title}</h3>
                      {getEventStatus(event.startsAt)}
                    </div>
                    <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(startDate, 'h:mm a')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-5">
                  <p className="text-sm line-clamp-3 text-foreground/80">{event.description}</p>
                </CardContent>
                
                <CardFooter className="p-4 border-t bg-muted/10 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{event.rsvpCount} attending</span>
                  </div>
                  
                  <Button 
                    variant={event.isRsvpedByMe ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleRsvp(event.id, event.isRsvpedByMe)}
                    disabled={isEventPast}
                  >
                    {event.isRsvpedByMe ? "Cancel RSVP" : "RSVP"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
