import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import AnalyticsCard from "@/components/analytics-card";
import { Subscriber, Campaign } from "@shared/schema";
import {
  MailIcon,
  UsersIcon,
  MousePointerClick,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("7days");

  const { data: subscribers = [] } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers"],
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const activeSubscribers = subscribers.filter((s) => s.subscribed).length;
  const totalOpens = campaigns.reduce((sum, c) => sum + c.opens, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const clickThroughRate = totalOpens
    ? Math.round((totalClicks / totalOpens) * 100)
    : 0;
  const averageOpenRate = campaigns.length
    ? Math.round(
        (totalOpens / campaigns.reduce((sum, c) => sum + c.recipients, 0)) * 100
      )
    : 0;

  // Calculate growth rates
  const previousSubscribers = 230; // This would come from an API in a real app
  const subscriberGrowth = Math.round(
    ((subscribers.length - previousSubscribers) / previousSubscribers) * 100
  );
  const previousOpenRate = 28; // This would come from an API in a real app
  const openRateGrowth = averageOpenRate - previousOpenRate;

  // Generate trend data
  const getDaysInRange = (days) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();
  };

  const daysInRange =
    timeRange === "30days"
      ? getDaysInRange(30)
      : timeRange === "14days"
      ? getDaysInRange(14)
      : getDaysInRange(7);

  const subscribersTrend = daysInRange.map((date) => ({
    date,
    value: Math.floor(Math.random() * 10) + 1, // Mock data - would be real data from API
  }));

  const opensTrend = daysInRange.map((date) => ({
    date,
    value: campaigns
      .filter((c) => c.sentAt && c.sentAt.split("T")[0] === date)
      .reduce((sum, c) => sum + c.opens, 0),
  }));

  const clicksTrend = daysInRange.map((date) => ({
    date,
    value: campaigns
      .filter((c) => c.sentAt && c.sentAt.split("T")[0] === date)
      .reduce((sum, c) => sum + (c.clicks || 0), 0),
  }));

  // Subscriber sources data (mock data)
  const subscriberSources = [
    { name: "Direct", value: Math.floor(subscribers.length * 0.45) },
    { name: "Referral", value: Math.floor(subscribers.length * 0.25) },
    { name: "Social", value: Math.floor(subscribers.length * 0.2) },
    { name: "Other", value: Math.floor(subscribers.length * 0.1) },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  // Recent campaigns
  const recentCampaigns = [...campaigns]
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, 5);

  // Recent subscribers
  const recentSubscribers = [...subscribers]
    .sort(
      (a, b) =>
        new Date(b.createdAt || "").getTime() -
        new Date(a.createdAt || "").getTime()
    )
    .slice(0, 4);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Last Updated: Today
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="14days">Last 14 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <AnalyticsCard
          title="Total Subscribers"
          value={subscribers.length}
          change={subscriberGrowth}
          changeLabel={`${
            subscriberGrowth >= 0 ? "+" : ""
          }${subscriberGrowth}% from last period`}
          trend={{
            data: subscribersTrend,
            color: "hsl(var(--primary))",
          }}
          icon={<UsersIcon className="h-4 w-4 text-primary" />}
        />
        <AnalyticsCard
          title="Active Subscribers"
          value={activeSubscribers}
          changeLabel={`${Math.round(
            (activeSubscribers / subscribers.length) * 100
          )}% of total`}
          icon={<UsersIcon className="h-4 w-4 text-emerald-500" />}
        />
        <AnalyticsCard
          title="Average Open Rate"
          value={`${averageOpenRate}%`}
          change={openRateGrowth}
          changeLabel={`${
            openRateGrowth >= 0 ? "+" : ""
          }${openRateGrowth}% from last period`}
          icon={<MousePointerClick className="h-4 w-4 text-amber-500" />}
        />
        <AnalyticsCard
          title="Click-Through Rate"
          value={`${clickThroughRate}%`}
          changeLabel={`${totalClicks} total clicks`}
          icon={<TrendingUp className="h-4 w-4 text-indigo-500" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>New subscribers over time</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subscribersTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#888"
                  strokeOpacity={0.2}
                />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Email Performance</CardTitle>
            <CardDescription>Opens and clicks over time</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={daysInRange.map((date, i) => ({
                  date,
                  opens: opensTrend[i]?.value || 0,
                  clicks: clicksTrend[i]?.value || 0,
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#888"
                  strokeOpacity={0.2}
                />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="opens"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Third row */}
      {/* <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>
                Performance of your latest campaigns
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Open Rate</TableHead>
                  <TableHead>Click Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((campaign) => {
                  const openRate = Math.round(
                    (campaign.opens / campaign.recipients) * 100
                  );
                  const clickRate = Math.round(
                    ((campaign.clicks || 0) / campaign.opens) * 100
                  );

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        {campaign.sentAt
                          ? formatDistanceToNow(new Date(campaign.sentAt), {
                              addSuffix: true,
                            })
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {openRate}%
                          {openRate > 35 ? (
                            <ArrowUpRight className="ml-1 h-4 w-4 text-green-500" />
                          ) : openRate < 20 ? (
                            <ArrowDownRight className="ml-1 h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {clickRate}%
                          {clickRate > 15 ? (
                            <ArrowUpRight className="ml-1 h-4 w-4 text-green-500" />
                          ) : clickRate < 5 ? (
                            <ArrowDownRight className="ml-1 h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {campaigns.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No campaigns sent yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Subscriber Sources</CardTitle>
            <CardDescription>Where your subscribers come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriberSources}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subscriberSources.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {subscriberSources.map((source, index) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center">
                    <div
                      className="h-3 w-3 rounded mr-2"
                      style={{ background: COLORS[index % COLORS.length] }}
                    ></div>
                    {source.name}
                  </div>
                  <div>
                    {Math.round((source.value / subscribers.length) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Fourth row */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Subscribers</CardTitle>
            <CardDescription>
              Latest people who joined your newsletter
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubscribers.length > 0 ? (
              <div className="space-y-4">
                {recentSubscribers.map((subscriber) => (
                  <div
                    key={subscriber.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {subscriber.name
                            ? subscriber.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : subscriber.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {subscriber.name || "Unknown"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {subscriber.email}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={subscriber.subscribed ? "default" : "outline"}
                    >
                      {subscriber.subscribed ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No subscribers yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to manage your newsletter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-24 flex flex-col items-center justify-center space-y-2">
                <MailIcon className="h-6 w-6" />
                <span>Create Campaign</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2"
              >
                <UsersIcon className="h-6 w-6" />
                <span>Add Subscribers</span>
              </Button>
              <Button
                variant="secondary"
                className="h-24 flex flex-col items-center justify-center space-y-2"
              >
                <MousePointerClick className="h-6 w-6" />
                <span>Track Analytics</span>
              </Button>
              <Button
                variant="ghost"
                className="h-24 flex flex-col items-center justify-center space-y-2"
              >
                <TrendingUp className="h-6 w-6" />
                <span>View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
