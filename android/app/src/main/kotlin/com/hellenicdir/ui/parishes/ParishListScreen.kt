package com.hellenicdir.ui.parishes

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hellenicdir.core.network.ApiService
import com.hellenicdir.data.remote.dto.ParishDto
import com.hellenicdir.data.remote.dto.PaginationMetaDto
import com.hellenicdir.ui.designsystem.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ParishListUiState(
    val parishes: List<ParishDto> = emptyList(),
    val meta: PaginationMetaDto? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val page: Int = 1
)

@HiltViewModel
class ParishListViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow(ParishListUiState(isLoading = true))
    val state = _state.asStateFlow()

    var searchQuery = mutableStateOf("")
    var stateFilter = mutableStateOf("")

    init { search() }

    fun search(page: Int = 1) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null, page = page) }
            try {
                val result = api.getParishes(
                    search = searchQuery.value.ifBlank { null },
                    state = stateFilter.value.ifBlank { null },
                    page = page
                )
                _state.update { it.copy(parishes = result.data, meta = result.meta, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}

@Composable
fun ParishListScreen(onParishClick: (String) -> Unit, viewModel: ParishListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        // Search header
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            HDSectionHeader("Parish Directory")
            HDSearchBar(
                query = viewModel.searchQuery.value,
                onQueryChange = { viewModel.searchQuery.value = it },
                onSearch = { viewModel.search() }
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = viewModel.stateFilter.value,
                    onValueChange = { viewModel.stateFilter.value = it.uppercase().take(2) },
                    label = { Text("State") },
                    modifier = Modifier.width(100.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = HDGold, unfocusedBorderColor = HDMuted.copy(alpha = 0.3f))
                )
                Spacer(Modifier.weight(1f))
                state.meta?.let {
                    Text("${it.total} parishes", style = MaterialTheme.typography.bodyMedium, color = HDMuted, modifier = Modifier.align(Alignment.CenterVertically))
                }
            }
        }

        when {
            state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = HDGold) }
            state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
            }
            else -> LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.parishes, key = { it.id }) { parish ->
                    HDCard(modifier = Modifier.fillMaxWidth().clickable { onParishClick(parish.id) }) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(parish.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                            val location = listOfNotNull(parish.city, parish.state).joinToString(", ")
                            if (location.isNotEmpty()) {
                                Spacer(Modifier.height(4.dp))
                                Text(location, style = MaterialTheme.typography.bodyMedium, color = HDMuted)
                            }
                            parish.phone?.let {
                                Spacer(Modifier.height(2.dp))
                                Text(it, style = MaterialTheme.typography.labelSmall, color = HDMuted)
                            }
                        }
                    }
                }
                // Pagination
                item {
                    state.meta?.let { meta ->
                        if (meta.pages > 1) {
                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                TextButton(onClick = { viewModel.search(state.page - 1) }, enabled = state.page > 1) { Text("← Previous", color = HDGold) }
                                Text("${state.page} / ${meta.pages}", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.align(Alignment.CenterVertically))
                                TextButton(onClick = { viewModel.search(state.page + 1) }, enabled = state.page < meta.pages) { Text("Next →", color = HDGold) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ParishDetailScreen(parishId: String, viewModel: ParishDetailViewModel = hiltViewModel()) {
    LaunchedEffect(parishId) { viewModel.load(parishId) }
    val state by viewModel.state.collectAsState()

    when {
        state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = HDGold) }
        state.parish == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Parish not found", color = HDMuted) }
        else -> {
            val p = state.parish!!
            LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item {
                    Column {
                        Text(p.name, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                        p.metropolis?.let { Text(it.name, style = MaterialTheme.typography.bodyMedium, color = HDMuted) }
                        Spacer(Modifier.height(8.dp))
                        HDMeanderDivider()
                    }
                }
                item {
                    HDCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Contact Information", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                            p.address?.let { InfoRow("Address", it) }
                            val loc = listOfNotNull(p.city, p.state, p.zip).joinToString(", ")
                            if (loc.isNotEmpty()) InfoRow("Location", loc)
                            p.phone?.let { InfoRow("Phone", it) }
                            p.email?.let { InfoRow("Email", it) }
                            p.website?.let { InfoRow("Website", it) }
                        }
                    }
                }
                p.clergy?.let { clergyList ->
                    if (clergyList.isNotEmpty()) {
                        item {
                            HDCard(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("Clergy", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                                    clergyList.forEach { c ->
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                            HDAvatar(initials = c.fullName.take(1), size = 36.dp)
                                            Column {
                                                Text(listOfNotNull(c.title, c.fullName).joinToString(" "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                                                c.email?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = HDGold) }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = HDMuted, modifier = Modifier.width(72.dp))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
    }
}

data class ParishDetailUiState(val parish: ParishDto? = null, val isLoading: Boolean = true)

@HiltViewModel
class ParishDetailViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow(ParishDetailUiState())
    val state = _state.asStateFlow()

    fun load(id: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val parish = api.getParish(id)
                _state.update { it.copy(parish = parish, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }
}
