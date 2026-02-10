"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, RefreshCw, Zap } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function ModelSelector({
  value,
  onValueChange,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const models = useQuery(api.models.getModels, {
    searchTerm: searchTerm || undefined,
  });
  const refreshModels = useAction(api.experiments.getOpenRouterModels);

  const selectedModel = models?.find((m) => m.id === value);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await refreshModels();
      toast.success("Model list updated from OpenRouter");
    } catch (err) {
      toast.error("Failed to refresh models");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 text-xs", className)}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedModel ? (
              <>
                <span className="font-medium truncate">
                  {selectedModel.name}
                </span>
                <span className="text-[10px] text-muted-foreground truncate opacity-50">
                  {selectedModel.id}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Select model...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search OpenRouter models..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="flex-1 border-none focus:ring-0 h-10 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-1"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("size-3.5", isRefreshing && "animate-spin")}
              />
            </Button>
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup>
              {models?.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 py-2 px-3 text-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">
                        {model.name}
                      </span>
                      <Check
                        className={cn(
                          "h-3 w-3 shrink-0",
                          value === model.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </div>
                    {model.pricing && (
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1 opacity-70"
                      >
                        $
                        {(parseFloat(model.pricing.prompt) * 1000000).toFixed(
                          2,
                        )}
                        /M
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground w-full">
                    <span className="truncate flex-1">{model.id}</span>
                    {model.context_length && (
                      <span className="shrink-0 flex items-center gap-0.5">
                        <Zap className="size-2.5" />
                        {(model.context_length / 1024).toFixed(0)}k
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
