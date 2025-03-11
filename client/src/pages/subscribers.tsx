import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import SubscriberList from "@/components/subscriber-list";
import { Subscriber } from "@shared/schema";
import {
  Loader2,
  Search,
  Filter,
  UserPlus,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Subscribers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const {
    data: subscribers,
    isLoading,
    isError,
    refetch,
  } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers"],
  });

  // Filter subscribers based on search query and status filter
  const filteredSubscribers = React.useMemo(() => {
    if (!subscribers) return [];

    return subscribers.filter((subscriber) => {
      const matchesSearch =
        searchQuery === "" ||
        subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subscriber.name &&
          subscriber.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && subscriber.subscribed) ||
        (filterStatus === "inactive" && !subscriber.subscribed);

      return matchesSearch && matchesFilter;
    });
  }, [subscribers, searchQuery, filterStatus]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSubscribers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Count statistics
  const totalSubscribers = subscribers?.length || 0;
  const activeSubscribers =
    subscribers?.filter((s) => s.subscribed).length || 0;
  const inactiveSubscribers = totalSubscribers - activeSubscribers;

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
            <p className="text-muted-foreground">
              Manage your newsletter subscribers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">{totalSubscribers}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold text-emerald-600">
                  {activeSubscribers}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Inactive Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold text-gray-500">
                  {inactiveSubscribers}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search subscribers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subscribers</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Subscriber list with loading states */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Subscriber List</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading subscribers..."
                : `Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredSubscribers.length)} of ${filteredSubscribers.length} subscribers`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-muted-foreground mb-4">
                  Failed to load subscribers
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-2">
                  No subscribers found
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first subscriber to get started"}
                </p>
              </div>
            ) : (
              <SubscriberList subscribers={currentItems} />
            )}
          </CardContent>
          
          {/* Pagination controls */}
          {!isLoading && !isError && filteredSubscribers.length > 0 && (
            <CardFooter className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {totalPages <= 5 ? (
                    <>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <Button
                          key={i + 1}
                          variant={currentPage === i + 1 ? "default" : "outline"}
                          size="icon"
                          onClick={() => handlePageChange(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </>
                  ) : (
                    <>
                      {currentPage > 2 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(1)}
                        >
                          1
                        </Button>
                      )}
                      
                      {currentPage > 3 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      
                      {currentPage > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(currentPage - 1)}
                        >
                          {currentPage - 1}
                        </Button>
                      )}
                      
                      <Button
                        variant="default"
                        size="icon"
                      >
                        {currentPage}
                      </Button>
                      
                      {currentPage < totalPages && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(currentPage + 1)}
                        >
                          {currentPage + 1}
                        </Button>
                      )}
                      
                      {currentPage < totalPages - 2 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      
                      {currentPage < totalPages - 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}