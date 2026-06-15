import { useState } from "react";
import { useListHostels, useCreateHostel, useListColonies } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Search, MapPin, Phone, IndianRupee, Plus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListHostelsQueryKey } from "@workspace/api-client-react";

export default function Hostels() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColonyFilter, setSelectedColonyFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [colonyId, setColonyId] = useState("");

  const { data: hostels, isLoading: hostelsLoading } = useListHostels();
  const { data: colonies } = useListColonies();
  const createHostel = useCreateHostel();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !price || !description.trim() || !contactInfo.trim() || !colonyId) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    createHostel.mutate({
      data: {
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
        contactInfo: contactInfo.trim(),
        price: Number(price),
        colonyId: Number(colonyId)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Listing posted", description: "Your hostel listing was added successfully!" });
        setIsCreateOpen(false);
        // Reset form
        setName("");
        setAddress("");
        setPrice("");
        setDescription("");
        setContactInfo("");
        setColonyId("");
        queryClient.invalidateQueries({ queryKey: getListHostelsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to post listing", description: err.message, variant: "destructive" });
      }
    });
  };

  const filteredHostels = hostels?.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          h.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          h.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesColony = selectedColonyFilter === "all" || h.colonyId === Number(selectedColonyFilter);

    return matchesSearch && matchesColony;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Home className="h-8 w-8 text-primary" />
            Hostels & Room Rentals
          </h1>
          <p className="text-muted-foreground mt-1">Explore local PG rooms, hostels, and shared flats inside our colonies.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Post Rental Slot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>List Hostel/Room Accommodation</DialogTitle>
              <DialogDescription>Add rental details so neighbors or newcomers can reach out.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="name">Hostel / PG Name</Label>
                <Input id="name" placeholder="e.g. Skyline Girls Hostel or Single Room" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="price">Monthly Rent (₹)</Label>
                  <Input id="price" type="number" placeholder="e.g. 6500" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Colony Location</Label>
                  <Select value={colonyId} onValueChange={setColonyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Colony" />
                    </SelectTrigger>
                    <SelectContent>
                      {colonies?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="address">Full Address</Label>
                <Input id="address" placeholder="e.g. Flat 302, Phase 1, Skyline Colony" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact">Contact Details</Label>
                <Input id="contact" placeholder="e.g. Call Rupesh at +91 9876543210" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc">Description & Amenities</Label>
                <Textarea id="desc" placeholder="e.g. AC included, Wi-Fi, food provided 3 times a day. Strict security." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[90px] resize-none" />
              </div>

              <Button type="submit" className="w-full" disabled={createHostel.isPending}>
                {createHostel.isPending ? "Posting..." : "Create Listing"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search hostels, rooms, PG accommodations..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedColonyFilter} onValueChange={setSelectedColonyFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by Colony" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colonies</SelectItem>
            {colonies?.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid of Listings */}
      {hostelsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-48 bg-card border" />
          ))}
        </div>
      ) : filteredHostels && filteredHostels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHostels.map((hostel) => {
            const associatedColony = colonies?.find(c => c.id === hostel.colonyId);
            return (
              <Card key={hostel.id} className="group relative overflow-hidden transition-all duration-300 border-muted/50 bg-card hover:border-primary/20 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{hostel.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {hostel.address} {associatedColony && `(Colony: ${associatedColony.name})`}
                      </CardDescription>
                    </div>
                    <div className="shrink-0 flex items-center bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {hostel.price}/mo
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{hostel.description}</p>
                  
                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-foreground">{hostel.contactInfo}</span>
                    </div>
                    
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold text-[10px]">
                      {hostel.isAvailable ? "Available" : "Filled"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground opacity-30" />
            <h3 className="font-semibold text-base">No Accommodations Found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">There are no hostels or room listings currently matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
