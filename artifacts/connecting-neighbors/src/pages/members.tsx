import { useState } from "react";
import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Search, MapPin, Phone, Mail, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function Members() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });

  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) || 
    user.apartment?.toLowerCase().includes(search.toLowerCase()) ||
    user.bio?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Colony Directory</h1>
        <p className="text-muted-foreground">Get to know the people who live around you.</p>
      </div>

      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search by name, apartment, or interests..." 
          className="pl-10 h-12 text-base rounded-full bg-card shadow-sm border-muted/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-40" />
          ))
        ) : filteredUsers?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No neighbors found matching your search.
          </div>
        ) : (
          filteredUsers?.map((user) => (
            <Card key={user.id} className="overflow-hidden hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{user.name}</h3>
                      {user.isVerified && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 h-5 px-1.5 text-[10px]">Verified</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {user.apartment && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Unit {user.apartment}</span>
                        </div>
                      )}
                      
                      {user.bio && (
                        <p className="text-foreground/80 line-clamp-2 text-sm mt-2">{user.bio}</p>
                      )}
                      
                      <div className="flex items-center gap-1.5 text-xs opacity-70 pt-2">
                        <Calendar className="h-3 w-3" />
                        <span>Joined {formatDistanceToNow(new Date(user.joinedAt))} ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
