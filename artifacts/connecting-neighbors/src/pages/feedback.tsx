import { useState } from "react";
import { useSubmitFeedback } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Feedback() {
  const { toast } = useToast();
  const submitFeedback = useSubmitFeedback();
  
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<"bug" | "suggestion" | "complaint" | "other">("suggestion");
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast({ title: "Please write a comment", variant: "destructive" });
      return;
    }

    submitFeedback.mutate({
      data: {
        category,
        rating,
        comment: comment.trim()
      }
    }, {
      onSuccess: () => {
        toast({ title: "Feedback submitted successfully", description: "Thank you for helping us improve our neighborhood!" });
        setComment("");
        setRating(5);
        setCategory("suggestion");
      },
      onError: () => {
        toast({ title: "Failed to submit feedback", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">App Feedback</h1>
        <p className="text-muted-foreground">Share your thoughts, suggestions, or report bugs to help us build a better community experience.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Share Your Experience</CardTitle>
          <CardDescription>We read every piece of feedback to improve the neighborhood portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">What is this feedback about?</label>
              <Select 
                value={category} 
                onValueChange={(val: any) => setCategory(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggestion">Idea or Suggestion</SelectItem>
                  <SelectItem value="bug">Report a Bug</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Star Rating Widget */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">How would you rate your experience?</label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 rounded-md text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                  >
                    <Star 
                      className={`h-7 w-7 ${
                        (hoverRating !== null ? star <= hoverRating : star <= rating)
                          ? "fill-current"
                          : "text-muted/40"
                      }`} 
                    />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {rating === 5 ? "Excellent!" : rating === 4 ? "Good" : rating === 3 ? "Average" : rating === 2 ? "Below Average" : "Poor"}
                </span>
              </div>
            </div>

            {/* Comment Textarea */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Comments</label>
              <Textarea 
                placeholder="What did you like? What can we make better?" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[140px] resize-none bg-background"
                disabled={submitFeedback.isPending}
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
