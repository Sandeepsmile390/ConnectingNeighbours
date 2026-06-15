import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListAlerts, useCreateAlert, getListAlertsQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Plus, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["low", "medium", "high", "emergency"]),
});

export default function Alerts() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useListAlerts({ query: { queryKey: getListAlertsQueryKey() } });
  const createAlert = useCreateAlert();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "low",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createAlert.mutate({ data }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        toast({ title: "Alert posted successfully" });
      },
      onError: () => {
        toast({ title: "Failed to post alert", variant: "destructive" });
      }
    });
  };

  const getSeverityStyles = (severity: string, isResolved: boolean) => {
    if (isResolved) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
    
    switch (severity) {
      case 'emergency': return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-400";
      case 'high': return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400";
      case 'medium': return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400";
      case 'low': return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityIcon = (severity: string, isResolved: boolean) => {
    if (isResolved) return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    
    switch (severity) {
      case 'emergency': return <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'low': return <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default: return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-red-50/50 dark:bg-red-950/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
        <div className="flex gap-4 items-start sm:items-center">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-red-900 dark:text-red-300">Safety Alerts</h1>
            <p className="text-red-700/80 dark:text-red-400/80 text-sm mt-1">Report incidents, suspicious activity, or neighborhood hazards.</p>
          </div>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Report a Safety Issue
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low (FYI, Non-urgent)</SelectItem>
                          <SelectItem value="medium">Medium (Caution)</SelectItem>
                          <SelectItem value="high">High (Immediate hazard)</SelectItem>
                          <SelectItem value="emergency">Emergency (Call 911 first)</SelectItem>
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
                      <FormLabel>Headline</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Broken streetlight on Elm St." {...field} />
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
                          placeholder="Provide details about location, suspect description, or safety instructions." 
                          className="min-h-[100px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="destructive" className="w-full" disabled={createAlert.isPending}>
                  {createAlert.isPending ? "Posting..." : "Broadcast Alert"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted/30" />
            </Card>
          ))
        ) : alerts?.length === 0 ? (
          <div className="text-center py-16 bg-muted/10 rounded-xl border border-dashed">
            <ShieldAlert className="h-12 w-12 mx-auto text-green-500 opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-green-700 dark:text-green-400">All clear</h3>
            <p className="text-muted-foreground mt-1">There are no active safety alerts in your neighborhood.</p>
          </div>
        ) : (
          alerts?.map((alert) => (
            <Card key={alert.id} className={`overflow-hidden border-l-4 ${getSeverityStyles(alert.severity, alert.isResolved).split(' ')[0].replace('bg-', 'border-')}`}>
              <CardHeader className={`p-5 ${getSeverityStyles(alert.severity, alert.isResolved)} bg-opacity-30 dark:bg-opacity-10`}>
                <div className="flex gap-4">
                  <div className="mt-1">
                    {getSeverityIcon(alert.severity, alert.isResolved)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-lg text-foreground">{alert.title}</h3>
                      <div className="flex items-center gap-2">
                        {alert.isResolved && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>}
                        <span className="text-xs opacity-70 whitespace-nowrap">
                          {formatDistanceToNow(new Date(alert.createdAt))} ago
                        </span>
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mb-3">{alert.description}</p>
                    <div className="text-xs opacity-70 font-medium">
                      Reported by {alert.reporter.name} {alert.reporter.apartment ? `(${alert.reporter.apartment})` : ''}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
