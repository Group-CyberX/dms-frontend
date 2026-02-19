import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AuditFilter(){
    return (
        <Card className="shadow-sm border-muted">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <Filter className="h-4 w-4 text-muted-foreground" />
                Filters
            </CardHeader>
            <CardContent className="p-4 ">
                {/*filters*/}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/*User Filter*/}
                    <div>
                        <label className="text-sm font-medium mb-1 block">
                            User
                        </label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="All users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user1">User 1</SelectItem>
                                <SelectItem value="user2">User 2</SelectItem>
                            </SelectContent>
                        </Select>
                </div>
                {/*Action Filter*/}
                <div>
                    <label className="text-sm font-medium mb-1 block">
                        Action
                    </label>
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="login">Login</SelectItem>
                            <SelectItem value="logout">Logout</SelectItem>
                            <SelectItem value="data_change">Data Change</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/*Date From filter*/}
                <div>
                    <label className="text-sm font-medium mb-1 block">
                        Date From
                    </label>
                    <Input type="date" />
                </div>

                {/*Date To filter*/}
                <div>
                    <label className="text-sm font-medium mb-1 block">
                        Date To
                    </label>
                    <Input type="date" />
                </div>
            </div>

            {/*Filter Button*/}
            <div className="flex justify-start mt-6 gap-2 pt-4 border-t">
                <Button variant="outline" className="bg-[#953002] text-white hover:bg-[#6B2100] hover:text-white active:bg-[#953002] active:text-white">
                    Apply Filters
                </Button>
                <Button className="bg-[#FFFFFF] text-[#242424] border-1 hover:bg-[#953002] hover:text-white">
                    Clear 
                </Button>
            </div>
            </CardContent>
        </Card>
    )
}