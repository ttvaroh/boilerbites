import { useRouter } from "expo-router";
import { getTodayDateString } from "../../lib/timezone-utils";
import { SearchByDateComponent } from "../search-by-date";

export default function SearchPage() {
  const router = useRouter();
  
  return (
    <SearchByDateComponent 
      date={getTodayDateString()}
      showDateIndicator={true}
      showBackButton={false}
      paddingBottom={80}
    />
  );
}